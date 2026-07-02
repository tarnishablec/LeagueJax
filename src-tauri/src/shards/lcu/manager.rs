use std::collections::{HashMap, HashSet};
use std::future::Future;
use std::sync::{Arc, RwLock, Weak};

use reqwest::{Method, StatusCode};
use serde::Serialize;
use serde_json::Value;
use tokio::sync::{broadcast, Mutex};
use tokio::time::{interval, Duration};
use tokio_util::sync::CancellationToken;

use super::api::LcuApi;
use super::concepts::LcuWsEvent;
use super::detector::LcuDetector;
#[cfg(not(target_os = "windows"))]
use super::detector::NoopLcuDetector;
#[cfg(target_os = "windows")]
use super::detector::WindowsLcuDetector;
use super::http_client::{LcuHttpClient, LcuJsonResponse};
use super::instance::{InstanceLifecycleSignal, LcuInstance, LcuInstanceEvent, LcuInstanceState};
use super::session::LcuSession;
use super::tls::clear_lcu_cert_pin;
use crate::error::AppError;
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::log::HttpLogPolicy;
use crate::shards::network::NetworkConfig;
use crate::utils::league_cmd_arg::LeagueClientCmdArgs;
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "lcu.ts")]
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuInstanceInfo {
    pub pid: u32,
    pub port: u16,
    pub state: LcuInstanceState,
    pub is_focused: bool,
    pub install_dir: Option<String>,
    pub region: Option<String>,
    pub summoner: Option<SummonerInfo>,
    pub cmd_args: LeagueClientCmdArgs,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "lcu.ts")]
#[serde(rename_all = "camelCase")]
pub struct FocusChange {
    pub previous: Option<u32>,
    pub requested: Option<u32>,
    pub current: Option<u32>,
}

#[derive(Debug, Clone)]
pub enum LcuManagerStateEvent {
    FocusChanged(FocusChange),
    InstancesChanged(Vec<LcuInstanceInfo>),
}

const LCU_MANAGER_STATE_EVENT_BUFFER: usize = 64;
const LCU_MANAGER_WS_EVENT_BUFFER: usize = 512;
const URI_CURRENT_SUMMONER: &str = "/lol-summoner/v1/current-summoner";

pub struct LcuManager {
    detector: Box<dyn LcuDetector>,
    network_config: Arc<NetworkConfig>,
    http_log_policy: Arc<HttpLogPolicy>,
    sessions: RwLock<HashMap<u32, Arc<LcuSession>>>,
    inner: Mutex<ManagerInner>,
    state_event_tx: broadcast::Sender<LcuManagerStateEvent>,
    ws_event_tx: broadcast::Sender<LcuWsEvent>,
    cancel_token: CancellationToken,
}

struct ManagerInner {
    focus_pid: Option<u32>,
    consumer_tokens: HashMap<u32, CancellationToken>,
    summoner_cache: HashMap<u32, SummonerInfo>,
    region_cache: HashMap<u32, String>,
    pending_summoner_pids: HashSet<u32>,
    last_emitted_snapshot: Option<Vec<LcuInstanceInfo>>,
}

impl LcuManager {
    pub fn new(
        cancel_token: CancellationToken,
        network_config: Arc<NetworkConfig>,
        http_log_policy: Arc<HttpLogPolicy>,
    ) -> Self {
        let detector: Box<dyn LcuDetector> = select_detector();
        let (state_event_tx, _) = broadcast::channel(LCU_MANAGER_STATE_EVENT_BUFFER);
        let (ws_event_tx, _) = broadcast::channel(LCU_MANAGER_WS_EVENT_BUFFER);
        Self {
            detector,
            network_config,
            http_log_policy,
            sessions: RwLock::new(HashMap::new()),
            inner: Mutex::new(ManagerInner {
                focus_pid: None,
                consumer_tokens: HashMap::new(),
                summoner_cache: HashMap::new(),
                region_cache: HashMap::new(),
                pending_summoner_pids: HashSet::new(),
                last_emitted_snapshot: None,
            }),
            state_event_tx,
            ws_event_tx,
            cancel_token,
        }
    }

    pub fn subscribe_state(&self) -> broadcast::Receiver<LcuManagerStateEvent> {
        self.state_event_tx.subscribe()
    }

    pub fn subscribe_ws(&self) -> broadcast::Receiver<LcuWsEvent> {
        self.ws_event_tx.subscribe()
    }

    pub fn subscribe_state_fn<F, Fut>(self: Arc<Self>, f: F)
    where
        F: Fn(LcuManagerStateEvent) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        let mut state_event_rx = self.subscribe_state();
        let manager = self.clone();
        let token = self.cancel_token.child_token();
        tokio::spawn(async move {
            let initial_focus = manager.current_focus_change().await;
            f(LcuManagerStateEvent::FocusChanged(initial_focus)).await;

            loop {
                tokio::select! {
                    _ = token.cancelled() => break,
                    result = state_event_rx.recv() => {
                        match result {
                            Ok(event) => {
                                f(event).await;
                            }
                            Err(broadcast::error::RecvError::Lagged(skipped)) => {
                                tracing::warn!("LCU manager state channel lagged; skipped {skipped} events");
                            }
                            Err(broadcast::error::RecvError::Closed) => break,
                        }
                    }
                }
            }
        });
    }

    pub fn subscribe_ws_fn<F, Fut>(self: Arc<Self>, f: F)
    where
        F: Fn(LcuWsEvent) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        let mut ws_event_rx = self.subscribe_ws();
        let token = self.cancel_token.child_token();
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = token.cancelled() => break,
                    result = ws_event_rx.recv() => {
                        match result {
                            Ok(event) => {
                                f(event).await;
                            }
                            Err(broadcast::error::RecvError::Lagged(skipped)) => {
                                tracing::warn!("LCU manager ws channel lagged; skipped {skipped} events");
                            }
                            Err(broadcast::error::RecvError::Closed) => break,
                        }
                    }
                }
            }
        });
    }

    pub async fn run(self: Arc<Self>) {
        let mut process_tick = interval(Duration::from_secs(2));

        loop {
            tokio::select! {
                _ = self.cancel_token.cancelled() => break,
                _ = process_tick.tick() => {
                    self.poll_processes().await;
                    self.cleanup_and_sync(false).await;
                }
            }
        }
    }

    pub async fn focused(&self) -> Option<Arc<LcuSession>> {
        let pid = self.focused_pid().await?;
        self.session_for_pid(pid)
    }

    pub fn session_for_pid(&self, pid: u32) -> Option<Arc<LcuSession>> {
        self.sessions
            .read()
            .ok()
            .and_then(|sessions| sessions.get(&pid).cloned())
    }

    pub fn any_ready_session(&self) -> Option<Arc<LcuSession>> {
        let sessions = self.sessions.read().ok()?;
        let pid = sessions
            .iter()
            .filter(|(_, session)| session.is_ready())
            .map(|(pid, _)| *pid)
            .min()?;
        sessions.get(&pid).cloned()
    }

    pub fn ready_sessions(&self) -> Vec<Arc<LcuSession>> {
        let mut sessions = self
            .sessions
            .read()
            .map(|sessions| {
                sessions
                    .iter()
                    .filter(|(_, session)| session.is_ready())
                    .map(|(pid, session)| (*pid, session.clone()))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        sessions.sort_by_key(|(pid, _)| *pid);
        sessions.into_iter().map(|(_, session)| session).collect()
    }

    pub async fn focused_pid(&self) -> Option<u32> {
        let inner = self.inner.lock().await;
        inner.focus_pid
    }

    pub async fn current_instances_snapshot(&self) -> Vec<LcuInstanceInfo> {
        let inner = self.inner.lock().await;
        self.build_instances_snapshot(&inner)
    }

    async fn current_focus_change(&self) -> FocusChange {
        let current = self.focused_pid().await;
        FocusChange {
            previous: None,
            requested: current,
            current,
        }
    }

    async fn consume_instance_events(
        manager: Weak<Self>,
        pid: u32,
        mut receiver: broadcast::Receiver<LcuInstanceEvent>,
        token: CancellationToken,
    ) {
        loop {
            tokio::select! {
                _ = token.cancelled() => break,
                result = receiver.recv() => {
                    match result {
                        Ok(event) => {
                            let Some(mgr) = manager.upgrade() else {
                                break;
                            };
                            mgr.handle_instance_event(pid, event).await;
                        }
                        Err(broadcast::error::RecvError::Lagged(skipped)) => {
                            tracing::warn!(
                                "LCU instance event stream lagged for pid {}; skipped {} events",
                                pid,
                                skipped
                            );
                        }
                        Err(broadcast::error::RecvError::Closed) => break,
                    }
                }
            }
        }
    }

    async fn handle_instance_event(self: &Arc<Self>, pid: u32, event: LcuInstanceEvent) {
        match event {
            LcuInstanceEvent::Signal(signal) => {
                let auto_focus = match signal {
                    InstanceLifecycleSignal::AuthOk(client) => {
                        if let Some(session) = self.session_for_pid(pid) {
                            session.set_http_client(client.clone());
                        }
                        let inner = self.inner.lock().await;
                        inner.focus_pid.is_none()
                    }
                    InstanceLifecycleSignal::AuthFailed
                    | InstanceLifecycleSignal::WsDisconnected
                    | InstanceLifecycleSignal::ProcessLost => {
                        if let Some(session) = self.session_for_pid(pid) {
                            session.clear_http_client();
                        }
                        false
                    }
                };
                self.cleanup_and_sync(auto_focus).await;
            }
            LcuInstanceEvent::WsEvent(event) => {
                let focused = {
                    let inner = self.inner.lock().await;
                    inner.focus_pid == Some(pid)
                };
                if focused {
                    let _ = self.ws_event_tx.send(event);
                }
            }
        }
    }

    async fn poll_processes(self: &Arc<Self>) {
        let current = self.detector.detect_all().await;
        let current_pids: HashSet<u32> = current.iter().map(|d| d.auth.pid).collect();
        let known_pids: HashSet<u32> = {
            self.sessions
                .read()
                .map(|s| s.keys().copied().collect())
                .unwrap_or_default()
        };

        for detected in current {
            let pid = detected.auth.pid;
            if !known_pids.contains(&pid) {
                tracing::info!(
                    "LCU process discovered: pid={}, port={}",
                    detected.auth.pid,
                    detected.auth.port
                );
                let install_dir = detected
                    .ux_exe_path
                    .as_ref()
                    .and_then(|p| p.parent())
                    .map(|p| p.to_string_lossy().into_owned());

                let instance = LcuInstance::new(
                    detected.auth,
                    install_dir,
                    self.network_config.clone(),
                    self.http_log_policy.clone(),
                );
                let events = instance.subscribe();
                let api = LcuApi::new();
                let session = Arc::new(LcuSession::new(instance, api));

                if let Ok(mut sessions) = self.sessions.write() {
                    sessions.insert(pid, session);
                }
                let consumer_token = self.cancel_token.child_token();
                {
                    let mut inner = self.inner.lock().await;
                    inner.consumer_tokens.insert(pid, consumer_token.clone());
                }
                let manager = Arc::downgrade(self);
                tokio::spawn(Self::consume_instance_events(
                    manager,
                    pid,
                    events,
                    consumer_token,
                ));
            }
        }

        for pid in known_pids.difference(&current_pids) {
            if let Some(session) = self.session_for_pid(*pid) {
                tracing::info!("LCU process lost: pid={}", pid);
                session.notify_process_lost();
            }
        }
    }

    async fn cleanup_and_sync(self: &Arc<Self>, auto_focus: bool) {
        let focus_lost = self.remove_closed_sessions().await;
        self.fetch_missing_summoners().await;
        let focus_invalid = {
            let inner = self.inner.lock().await;
            match inner.focus_pid {
                Some(pid) => self.session_for_pid(pid).is_none_or(|s| !s.is_ready()),
                None => false,
            }
        };
        if auto_focus || focus_lost || focus_invalid {
            self.update_focus(Some(0)).await;
        } else {
            self.emit_snapshot().await;
        }
    }

    async fn remove_closed_sessions(&self) -> bool {
        let mut inner = self.inner.lock().await;
        let closed: Vec<u32> = {
            let sessions = self.sessions.read().unwrap_or_else(|e| e.into_inner());
            sessions
                .iter()
                .filter(|(_, s)| s.is_closing())
                .map(|(pid, _)| *pid)
                .collect()
        };

        if closed.is_empty() {
            return false;
        }

        let mut focus_lost = false;
        for pid in &closed {
            tracing::debug!("Removing closed LCU instance: pid={}", pid);
            if let Some(token) = inner.consumer_tokens.remove(pid) {
                token.cancel();
            }
            inner.summoner_cache.remove(pid);
            inner.region_cache.remove(pid);
            inner.pending_summoner_pids.remove(pid);
            clear_lcu_cert_pin(*pid);
            if inner.focus_pid == Some(*pid) {
                inner.focus_pid = None;
                focus_lost = true;
            }
        }
        drop(inner);

        if let Ok(mut sessions) = self.sessions.write() {
            for pid in &closed {
                if let Some(session) = sessions.remove(pid) {
                    session.clear_http_client();
                }
            }
        }
        focus_lost
    }

    pub async fn update_focus(&self, requested: Option<u32>) {
        let change = {
            let mut inner = self.inner.lock().await;
            let previous = inner.focus_pid;
            let current = match requested {
                None => {
                    inner.focus_pid = None;
                    None
                }
                Some(0) => {
                    let ready: Vec<u32> = {
                        let sessions = self.sessions.read().unwrap_or_else(|e| e.into_inner());
                        sessions
                            .iter()
                            .filter(|(_, s)| s.is_ready())
                            .map(|(pid, _)| *pid)
                            .collect()
                    };
                    let next = if ready.len() == 1 {
                        Some(ready[0])
                    } else {
                        None
                    };
                    inner.focus_pid = next;
                    next
                }
                Some(pid) => {
                    let next = self
                        .session_for_pid(pid)
                        .filter(|s| s.is_ready())
                        .map(|_| pid);
                    inner.focus_pid = next;
                    next
                }
            };
            FocusChange {
                previous,
                requested,
                current,
            }
        };
        tracing::debug!("LCU focus change: {:?}", change);
        let _ = self
            .state_event_tx
            .send(LcuManagerStateEvent::FocusChanged(change));
        self.emit_snapshot().await;
    }

    async fn fetch_missing_summoners(self: &Arc<Self>) {
        let clients = {
            let mut inner = self.inner.lock().await;
            let sessions = self.sessions.read().unwrap_or_else(|e| e.into_inner());
            let mut clients = Vec::new();
            for (pid, session) in sessions.iter() {
                if !session.is_ready()
                    || inner.summoner_cache.contains_key(pid)
                    || inner.pending_summoner_pids.contains(pid)
                {
                    continue;
                }
                let Some(client) = session.api().http_client() else {
                    continue;
                };
                clients.push((*pid, client));
            }
            for (pid, _) in &clients {
                inner.pending_summoner_pids.insert(*pid);
            }
            clients
        };

        for (pid, client) in clients {
            let manager = Arc::downgrade(self);
            let token = self.cancel_token.child_token();
            tokio::spawn(async move {
                tokio::select! {
                    _ = token.cancelled() => {}
                    result = fetch_summoner_task(client) => {
                        match result {
                            Some((info, region)) => {
                                if let Some(manager) = manager.upgrade() {
                                    manager.apply_summoner_fetched(pid, info, region).await;
                                }
                            }
                            None => {
                                if let Some(manager) = manager.upgrade() {
                                    manager.apply_summoner_failed(pid).await;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    async fn apply_summoner_fetched(&self, pid: u32, info: SummonerInfo, region: Option<String>) {
        {
            let mut inner = self.inner.lock().await;
            inner.pending_summoner_pids.remove(&pid);
            if self.session_for_pid(pid).is_some() {
                inner.summoner_cache.insert(pid, info);
                if let Some(r) = region {
                    inner.region_cache.insert(pid, r);
                }
            }
        }
        self.emit_snapshot().await;
    }

    async fn apply_summoner_failed(&self, pid: u32) {
        let mut inner = self.inner.lock().await;
        inner.pending_summoner_pids.remove(&pid);
    }

    fn build_instances_snapshot(&self, inner: &ManagerInner) -> Vec<LcuInstanceInfo> {
        let sessions = self.sessions.read().unwrap_or_else(|e| e.into_inner());
        let mut snapshot = sessions
            .iter()
            .map(|(pid, session)| {
                let auth = session.auth();
                let state = session.status();
                LcuInstanceInfo {
                    pid: auth.pid,
                    port: auth.port,
                    state,
                    is_focused: inner.focus_pid == Some(*pid),
                    install_dir: session.install_dir().map(ToString::to_string),
                    summoner: inner.summoner_cache.get(pid).cloned(),
                    region: inner.region_cache.get(pid).cloned(),
                    cmd_args: auth.cmd_args.clone(),
                }
            })
            .collect::<Vec<_>>();
        snapshot.sort_by_key(|instance| instance.pid);
        snapshot
    }

    async fn emit_snapshot(&self) {
        let snapshot: Vec<LcuInstanceInfo> = {
            let mut inner = self.inner.lock().await;
            let snapshot = self.build_instances_snapshot(&inner);
            if inner.last_emitted_snapshot.as_ref() == Some(&snapshot) {
                return;
            }
            inner.last_emitted_snapshot = Some(snapshot.clone());
            snapshot
        };
        let _ = self
            .state_event_tx
            .send(LcuManagerStateEvent::InstancesChanged(snapshot));
    }
}

fn select_detector() -> Box<dyn LcuDetector> {
    #[cfg(target_os = "windows")]
    {
        Box::new(WindowsLcuDetector)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Box::new(NoopLcuDetector)
    }
}

async fn fetch_summoner_task(client: Arc<LcuHttpClient>) -> Option<(SummonerInfo, Option<String>)> {
    let response = match client.get_response(URI_CURRENT_SUMMONER).await {
        Ok(response) => response,
        Err(e) => {
            tracing::debug!("Failed to fetch summoner: {e}");
            return None;
        }
    };
    let resp = match current_summoner_body_from_response(response) {
        Ok(Some(resp)) => resp,
        Ok(None) => return None,
        Err(e) => {
            tracing::debug!("Failed to fetch summoner: {e}");
            return None;
        }
    };

    let info = match serde_json::from_value::<SummonerInfo>(resp) {
        Ok(info) if !info.game_name.is_empty() => info,
        _ => {
            return None;
        }
    };

    let region = match client.get("/riotclient/region-locale").await {
        Ok(v) => v["region"].as_str().map(|s| s.to_string()),
        Err(_) => None,
    };

    Some((info, region))
}

fn current_summoner_body_from_response(
    response: LcuJsonResponse,
) -> Result<Option<Value>, AppError> {
    if response.status == StatusCode::NOT_FOUND {
        tracing::debug!(
            endpoint = URI_CURRENT_SUMMONER,
            status = response.status.as_u16(),
            "LCU current summoner is not available yet"
        );
        return Ok(None);
    }

    response.ensure_success(&Method::GET, URI_CURRENT_SUMMONER)?;
    Ok(Some(response.body))
}

#[cfg(test)]
mod tests {
    use super::current_summoner_body_from_response;
    use crate::shards::lcu::http_client::LcuJsonResponse;
    use reqwest::StatusCode;
    use serde_json::json;

    #[test]
    fn current_summoner_not_found_is_treated_as_missing() {
        let response = LcuJsonResponse {
            status: StatusCode::NOT_FOUND,
            body: json!({
                "errorCode": "RPC_ERROR",
                "httpStatus": 404,
                "message": "You are not logged in."
            }),
        };

        let result = current_summoner_body_from_response(response);

        assert!(matches!(result, Ok(None)));
    }
}
