use std::pin::Pin;
use std::sync::{Arc, LazyLock, Mutex};

use super::auth::LcuAuth;
use super::concepts::LcuWsEvent;
use super::http_client::LcuHttpClient;
use super::watcher::LcuWatcher;
use crate::error::AppError;
use crate::shards::log::HttpLogPolicy;
use crate::shards::network::NetworkConfig;
use futures_util::{Stream, StreamExt};
use maokai_runner::{Behavior, Behaviors, EventReply, Runner};
use maokai_tree::{DataView, State, StateTree, TreeView};
use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, mpsc};
use ts_rs::TS;

#[derive(Clone)]
pub enum InstanceLifecycleSignal {
    AuthOk(Arc<LcuHttpClient>),
    AuthFailed,
    WsDisconnected,
    ProcessLost,
}

#[derive(Clone)]
#[allow(clippy::large_enum_variant)]
pub enum LcuInstanceEvent {
    Signal(InstanceLifecycleSignal),
    WsEvent(LcuWsEvent),
}

type InstanceCtx = Arc<InstanceContext>;
type WatcherStream = Pin<Box<dyn Stream<Item = Result<LcuWsEvent, AppError>> + Send>>;

#[derive(TS, Serialize, Deserialize)]
#[ts(export, export_to = "lcu.ts")]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[repr(u8)]
pub enum LcuInstanceState {
    Idle = 0,
    Authenticating = 1,
    Ready = 2,
    Closing = 3,
}

pub struct LcuInstance {
    auth: LcuAuth,
    pub(crate) install_dir: Option<String>,
    event_tx: broadcast::Sender<LcuInstanceEvent>,
    driver: Arc<Mutex<InstanceDriver>>,
    input_tx: mpsc::UnboundedSender<LcuInstanceEvent>,
    _task: AbortOnDropHandle,
}

impl LcuInstance {
    pub fn new(
        auth: LcuAuth,
        install_dir: Option<String>,
        network_config: Arc<NetworkConfig>,
        http_log_policy: Arc<HttpLogPolicy>,
    ) -> Self {
        let (event_tx, _) = broadcast::channel(128);
        let (input_tx, input_rx) = mpsc::unbounded_channel();
        let driver = Arc::new(Mutex::new(InstanceDriver::new()));

        let runtime = InstanceRuntime {
            auth: auth.clone(),
            network_config,
            http_log_policy,
            watcher_stream: None,
            input_rx,
            driver: driver.clone(),
            ctx: Arc::new(InstanceContext {
                event_tx: event_tx.clone(),
            }),
        };

        let task = AbortOnDropHandle(tokio::spawn(async move {
            runtime.run().await;
        }));

        Self {
            auth,
            install_dir,
            event_tx,
            driver,
            input_tx,
            _task: task,
        }
    }

    pub fn auth(&self) -> &LcuAuth {
        &self.auth
    }

    pub fn subscribe(&self) -> broadcast::Receiver<LcuInstanceEvent> {
        self.event_tx.subscribe()
    }

    pub fn notify_process_lost(&self) {
        let _ = self.input_tx.send(LcuInstanceEvent::Signal(
            InstanceLifecycleSignal::ProcessLost,
        ));
    }

    pub fn is_ready(&self) -> bool {
        self.status() == LcuInstanceState::Ready
    }

    pub fn is_closing(&self) -> bool {
        self.status() == LcuInstanceState::Closing
    }

    pub fn status(&self) -> LcuInstanceState {
        self.driver
            .lock()
            .ok()
            .map(|driver_guard| driver_guard.current_state())
            .unwrap_or(LcuInstanceState::Authenticating)
    }
}

struct AbortOnDropHandle(tokio::task::JoinHandle<()>);

impl Drop for AbortOnDropHandle {
    fn drop(&mut self) {
        self.0.abort();
    }
}

struct InstanceContext {
    event_tx: broadcast::Sender<LcuInstanceEvent>,
}

struct InstanceRuntime {
    auth: LcuAuth,
    network_config: Arc<NetworkConfig>,
    http_log_policy: Arc<HttpLogPolicy>,
    watcher_stream: Option<WatcherStream>,
    input_rx: mpsc::UnboundedReceiver<LcuInstanceEvent>,
    driver: Arc<Mutex<InstanceDriver>>,
    ctx: InstanceCtx,
}

impl InstanceRuntime {
    async fn run(mut self) {
        loop {
            let previous_status = self.status();
            if previous_status == LcuInstanceState::Closing {
                break;
            }

            let Some(input) = self.next_input(previous_status).await else {
                break;
            };

            self.process_input(&input);

            let next_status = self.status();
            if previous_status == LcuInstanceState::Ready && next_status != LcuInstanceState::Ready
            {
                self.watcher_stream = None;
            }

            let is_auth_retry = next_status == LcuInstanceState::Authenticating
                && matches!(
                    input,
                    LcuInstanceEvent::Signal(InstanceLifecycleSignal::AuthFailed)
                );

            if is_auth_retry && !self.wait_retry_or_interrupt().await {
                break;
            }
        }
    }

    async fn next_input(&mut self, status: LcuInstanceState) -> Option<LcuInstanceEvent> {
        match status {
            LcuInstanceState::Idle | LcuInstanceState::Authenticating => {
                self.next_auth_input().await
            }
            LcuInstanceState::Ready => self.next_ready_input().await,
            LcuInstanceState::Closing => None,
        }
    }

    async fn next_auth_input(&mut self) -> Option<LcuInstanceEvent> {
        let auth = self.auth.clone();
        let network_config = self.network_config.clone();
        let http_log_policy = self.http_log_policy.clone();

        tokio::select! {
            input = self.input_rx.recv() => input,
            result = authenticate_once(&auth, network_config, http_log_policy) => Some(result),
        }
    }

    async fn next_ready_input(&mut self) -> Option<LcuInstanceEvent> {
        if self.watcher_stream.is_none() {
            self.watcher_stream = Some(Box::pin(LcuWatcher::event_stream(&self.auth)));
        }

        match self.watcher_stream.as_mut() {
            Some(stream) => {
                tokio::select! {
                    input = self.input_rx.recv() => input,
                    item = stream.next() => {
                        match item {
                            Some(Ok(event)) => Some(LcuInstanceEvent::WsEvent(event)),
                            Some(Err(error)) => {
                                tracing::warn!(
                                    "LCU watcher for pid {} ended with error: {}",
                                    self.auth.pid,
                                    error
                                );
                                Some(LcuInstanceEvent::Signal(InstanceLifecycleSignal::WsDisconnected))
                            }
                            None => Some(LcuInstanceEvent::Signal(InstanceLifecycleSignal::WsDisconnected)),
                        }
                    }
                }
            }
            None => Some(LcuInstanceEvent::Signal(
                InstanceLifecycleSignal::WsDisconnected,
            )),
        }
    }

    async fn wait_retry_or_interrupt(&mut self) -> bool {
        tokio::select! {
            maybe_input = self.input_rx.recv() => {
                match maybe_input {
                    Some(forced_input) => {
                        self.process_input(&forced_input);
                        true
                    }
                    None => false,
                }
            }
            _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)) => true,
        }
    }

    fn process_input(&self, input: &LcuInstanceEvent) {
        let mut ctx_arg = self.ctx.clone();
        if let Ok(mut driver_guard) = self.driver.lock() {
            driver_guard.process(input, &mut ctx_arg);
        }
    }

    fn status(&self) -> LcuInstanceState {
        self.driver
            .lock()
            .ok()
            .map(|driver_guard| driver_guard.current_state())
            .unwrap_or(LcuInstanceState::Authenticating)
    }
}

struct InstanceDriver {
    current: State,
    runner: Runner<'static, LcuInstanceState>,
    behaviors: Behaviors<'static, LcuInstanceEvent, InstanceCtx>,
}

impl InstanceDriver {
    fn new() -> Self {
        let (tree, _, authenticating, ready, closing) = &*INSTANCE_TREE;

        let mut behaviors = Behaviors::default();
        behaviors.register(authenticating, AuthenticatingBehavior);
        behaviors.register(ready, ReadyBehavior);
        behaviors.register(closing, ClosingBehavior);

        Self {
            current: *authenticating,
            runner: Runner::new(tree),
            behaviors,
        }
    }

    fn process(&mut self, input: &LcuInstanceEvent, ctx: &mut InstanceCtx) {
        let reply = self
            .runner
            .dispatch(&self.behaviors, &self.current, input, ctx);

        match reply {
            EventReply::Handled => (),
            EventReply::Transition(next) => {
                self.current = next;
            }
            EventReply::Ignored => (),
        }
    }

    fn current_state(&self) -> LcuInstanceState {
        INSTANCE_TREE
            .0
            .get_data(&self.current)
            .copied()
            .unwrap_or(LcuInstanceState::Authenticating)
    }
}

static INSTANCE_TREE: LazyLock<(StateTree<LcuInstanceState>, State, State, State, State)> =
    LazyLock::new(|| {
        let mut tree = StateTree::new(LcuInstanceState::Idle);
        let idle = tree.root();
        let authenticating = tree.add_child(&idle, LcuInstanceState::Authenticating);
        let ready = tree.add_child(&idle, LcuInstanceState::Ready);
        let closing = tree.add_child(&idle, LcuInstanceState::Closing);
        (tree, idle, authenticating, ready, closing)
    });

async fn authenticate_once(
    auth: &LcuAuth,
    network_config: Arc<NetworkConfig>,
    http_log_policy: Arc<HttpLogPolicy>,
) -> LcuInstanceEvent {
    match LcuHttpClient::new(auth.clone(), network_config, http_log_policy) {
        Ok(client) => {
            let client = Arc::new(client);
            match client.get("/riotclient/region-locale").await {
                Ok(_) => LcuInstanceEvent::Signal(InstanceLifecycleSignal::AuthOk(client)),
                Err(_) => LcuInstanceEvent::Signal(InstanceLifecycleSignal::AuthFailed),
            }
        }
        Err(_) => LcuInstanceEvent::Signal(InstanceLifecycleSignal::AuthFailed),
    }
}

struct AuthenticatingBehavior;

impl Behavior<LcuInstanceEvent, InstanceCtx> for AuthenticatingBehavior {
    fn on_event(
        &self,
        event: &LcuInstanceEvent,
        _current: &State,
        ctx: &mut InstanceCtx,
        _tree: &dyn TreeView,
    ) -> EventReply {
        let (_, _idle, _authenticating, ready, closing) = &*INSTANCE_TREE;
        match event {
            LcuInstanceEvent::Signal(InstanceLifecycleSignal::AuthOk(client)) => {
                let _ =
                    ctx.event_tx
                        .send(LcuInstanceEvent::Signal(InstanceLifecycleSignal::AuthOk(
                            client.clone(),
                        )));
                EventReply::Transition(*ready)
            }
            LcuInstanceEvent::Signal(InstanceLifecycleSignal::AuthFailed) => {
                let _ = ctx.event_tx.send(LcuInstanceEvent::Signal(
                    InstanceLifecycleSignal::AuthFailed,
                ));
                EventReply::Handled
            }
            LcuInstanceEvent::Signal(InstanceLifecycleSignal::ProcessLost) => {
                let _ = ctx.event_tx.send(LcuInstanceEvent::Signal(
                    InstanceLifecycleSignal::ProcessLost,
                ));
                EventReply::Transition(*closing)
            }
            _ => EventReply::Ignored,
        }
    }
}

struct ReadyBehavior;

impl Behavior<LcuInstanceEvent, InstanceCtx> for ReadyBehavior {
    fn on_event(
        &self,
        event: &LcuInstanceEvent,
        _current: &State,
        ctx: &mut InstanceCtx,
        _tree: &dyn TreeView,
    ) -> EventReply {
        let (_, _, _authenticating, _ready, closing) = &*INSTANCE_TREE;
        match event {
            LcuInstanceEvent::WsEvent(ws_event) => {
                let _ = ctx
                    .event_tx
                    .send(LcuInstanceEvent::WsEvent(ws_event.clone()));
                EventReply::Handled
            }
            LcuInstanceEvent::Signal(InstanceLifecycleSignal::WsDisconnected) => {
                let _ = ctx.event_tx.send(LcuInstanceEvent::Signal(
                    InstanceLifecycleSignal::WsDisconnected,
                ));
                EventReply::Transition(*closing)
            }
            LcuInstanceEvent::Signal(InstanceLifecycleSignal::ProcessLost) => {
                let _ = ctx.event_tx.send(LcuInstanceEvent::Signal(
                    InstanceLifecycleSignal::ProcessLost,
                ));
                EventReply::Transition(*closing)
            }
            _ => EventReply::Ignored,
        }
    }
}

struct ClosingBehavior;

impl Behavior<LcuInstanceEvent, InstanceCtx> for ClosingBehavior {
    fn on_event(
        &self,
        _event: &LcuInstanceEvent,
        _current: &State,
        _ctx: &mut InstanceCtx,
        _tree: &dyn TreeView,
    ) -> EventReply {
        EventReply::Handled
    }
}
