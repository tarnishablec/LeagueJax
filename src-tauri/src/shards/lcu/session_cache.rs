use std::any::Any;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use tokio::sync::OnceCell;

use crate::error::AppError;

type AnyBox = Box<dyn Any + Send + Sync>;
type Cell = Arc<OnceCell<AnyBox>>;

pub struct SessionCache {
    cells: Mutex<HashMap<String, Cell>>,
}

impl SessionCache {
    pub fn new() -> Self {
        Self {
            cells: Mutex::new(HashMap::new()),
        }
    }

    pub async fn get_or_try_init<T, F, Fut>(&self, key: &str, init: F) -> Result<T, AppError>
    where
        T: Clone + Send + Sync + 'static,
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, AppError>>,
    {
        let cell = {
            let mut cells = self.cells.lock().map_err(|_| AppError::MutexPoisoned)?;
            cells.entry(key.to_string()).or_default().clone()
        };
        let boxed = cell
            .get_or_try_init(|| async {
                let value = init().await?;
                Ok::<AnyBox, AppError>(Box::new(value))
            })
            .await?;
        boxed
            .downcast_ref::<T>()
            .cloned()
            .ok_or_else(|| AppError::other("session cache type mismatch"))
    }
}
