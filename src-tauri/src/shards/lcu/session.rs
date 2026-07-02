use super::api::LcuApi;
use super::auth::LcuAuth;
use super::http_client::LcuHttpClient;
use super::instance::{LcuInstance, LcuInstanceState};
use super::session_cache::SessionCache;
use std::sync::Arc;

pub struct LcuSession {
    instance: LcuInstance,
    api: LcuApi,
    cache: SessionCache,
}

impl LcuSession {
    pub fn new(instance: LcuInstance, api: LcuApi) -> Self {
        Self {
            instance,
            api,
            cache: SessionCache::new(),
        }
    }

    // ── Public API (for commands) ──

    pub fn auth(&self) -> &LcuAuth {
        self.instance.auth()
    }

    pub fn api(&self) -> &LcuApi {
        &self.api
    }

    pub fn cache(&self) -> &SessionCache {
        &self.cache
    }

    // ── Internal API (for manager) ──

    pub(crate) fn set_http_client(&self, client: Arc<LcuHttpClient>) {
        self.api.set_http_client(client);
    }

    pub(crate) fn clear_http_client(&self) {
        self.api.clear_http_client();
    }

    pub(crate) fn is_ready(&self) -> bool {
        self.instance.is_ready()
    }

    pub(crate) fn is_closing(&self) -> bool {
        self.instance.is_closing()
    }

    pub(crate) fn status(&self) -> LcuInstanceState {
        self.instance.status()
    }

    pub(crate) fn notify_process_lost(&self) {
        self.instance.notify_process_lost();
    }

    pub(crate) fn install_dir(&self) -> Option<&str> {
        self.instance.install_dir.as_deref()
    }
}
