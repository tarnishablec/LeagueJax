use super::auth::LcuAuth;
use super::concepts::LcuWsEvent;
use super::tls::build_lcu_client_tls_config;
use crate::error::AppError;
use futures_util::{stream, SinkExt, Stream, StreamExt};
use serde_json::Value;
use std::sync::Arc;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::{connect_async_tls_with_config, tungstenite::Message, Connector};

pub struct LcuWatcher;

impl LcuWatcher {
    pub fn event_stream(
        auth: &LcuAuth,
    ) -> impl Stream<Item = Result<LcuWsEvent, AppError>> + Send + 'static {
        let auth = auth.clone();
        stream::unfold(StreamState::Init(Box::from(auth)), |state| async move {
            let (item, next_state) = match state {
                StreamState::Init(auth) => match connect_ws(&auth).await {
                    Ok(ws) => (StreamItem::Skip, StreamState::Connected(Box::new(ws))),
                    Err(e) => (StreamItem::Emit(Err(e)), StreamState::Done),
                },
                StreamState::Connected(mut ws) => match next_event(&mut ws).await {
                    Some(event) => (StreamItem::Emit(event), StreamState::Connected(ws)),
                    None => return None,
                },
                StreamState::Done => return None,
            };

            Some((item, next_state))
        })
        .filter_map(|item| async move { item.into_event() })
    }
}

type LcuWsStream =
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

enum StreamState {
    Init(Box<LcuAuth>),
    Connected(Box<LcuWsStream>),
    Done,
}

#[allow(clippy::large_enum_variant)]
enum StreamItem {
    Skip,
    Emit(Result<LcuWsEvent, AppError>),
}

impl StreamItem {
    fn into_event(self) -> Option<Result<LcuWsEvent, AppError>> {
        match self {
            StreamItem::Skip => None,
            StreamItem::Emit(event) => Some(event),
        }
    }
}

async fn connect_ws(auth: &LcuAuth) -> Result<LcuWsStream, AppError> {
    let url = format!("wss://127.0.0.1:{}/", auth.port);

    let tls_config = build_lcu_client_tls_config(auth.pid);
    let connector = Connector::Rustls(Arc::new(tls_config));

    let request = {
        use tokio_tungstenite::tungstenite::client::IntoClientRequest;
        let mut req = url
            .into_client_request()
            .map_err(|e| AppError::other(e.to_string()))?;

        let auth =
            HeaderValue::from_str(&auth.auth_header).map_err(|e| AppError::other(e.to_string()))?;

        req.headers_mut().insert("Authorization", auth);
        req.headers_mut()
            .insert("Sec-WebSocket-Protocol", HeaderValue::from_static("wamp"));
        req
    };

    let (mut ws, _) = connect_async_tls_with_config(request, None, false, Some(connector))
        .await
        .map_err(|e| AppError::other(e.to_string()))?;

    let subscribe_msg = serde_json::json!([5, "OnJsonApiEvent"]).to_string();
    ws.send(Message::Text(subscribe_msg.into()))
        .await
        .map_err(|e| AppError::other(e.to_string()))?;

    Ok(ws)
}

async fn next_event(ws: &mut LcuWsStream) -> Option<Result<LcuWsEvent, AppError>> {
    while let Some(msg) = ws.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Some(event) = parse_event(&text) {
                    return Some(Ok(event));
                }
            }
            Ok(Message::Close(_)) => return None,
            Err(e) => return Some(Err(AppError::other(e.to_string()))),
            _ => {}
        }
    }
    None
}

fn parse_event(text: &str) -> Option<LcuWsEvent> {
    let Value::Array(arr) = serde_json::from_str::<Value>(text).ok()? else {
        return None;
    };
    if arr.len() < 3 {
        return None;
    }
    LcuWsEvent::try_from(arr[2].clone()).ok()
}
