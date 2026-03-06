# LeagueJax Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 搭建 LeagueJax 的完整骨架——所有模块框架、LCU 连接层、前端路由/状态/布局，实现零功能但完整可编译可运行。

**Architecture:** 静态插件式 Tauri 应用。Rust 后端通过 `Module` trait 统一管理所有功能模块的生命周期；`LcuConnector` 轮询检测 LCU 进程，`LcuWatcher` 订阅 WebSocket 并将事件路由给各模块和前端；前端使用 TanStack Router + Query + Zustand，通过 `invoke()` 和 Tauri events 与 Rust 通信。

**Tech Stack:** Tauri v2, React 19, Rust, shadcn/ui, Tailwind CSS v4, TanStack Router, TanStack Query, Zustand, i18next, rusqlite, reqwest, tokio-tungstenite, sysinfo, tauri-plugin-store

> **命名约定：** 功能模块 trait 名为 `Shard`，目录为 `shards/`，结构体命名为 `XxxShard`。

**Reference Design:** `docs/plans/2026-03-07-architecture-design.md`

---

## Phase 1: Rust 后端

### Task 1: 更新 Cargo.toml 依赖

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: 替换 Cargo.toml 内容**

```toml
[package]
name = "league-jax"
version = "0.1.0"
description = "A League of Legends toolkit built with Tauri"
authors = ["you"]
edition = "2021"

[lib]
name = "league_jax_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri              = { version = "2", features = ["tray-icon"] }
tauri-plugin-store = "2"
tauri-plugin-autostart       = "2"
tauri-plugin-global-shortcut = "2"
tauri-plugin-updater         = "2"
tauri-plugin-opener          = "2"

reqwest           = { version = "0.12", features = ["json", "rustls-tls"] }
tokio-tungstenite = { version = "0.24", features = ["rustls-tls-webpki-roots"] }
tokio             = { version = "1", features = ["full"] }
futures-util      = "0.3"
serde             = { version = "1", features = ["derive"] }
serde_json        = "1"
rusqlite          = { version = "0.31", features = ["bundled"] }
async-trait       = "0.1"
sysinfo           = "0.30"
base64            = "0.22"
thiserror         = "1"
tracing           = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

[dev-dependencies]
tokio = { version = "1", features = ["full", "test-util"] }
```

**Step 2: 验证依赖可以下载**

```bash
cd src-tauri && cargo fetch
```

期望：无错误（网络下载可能需要一些时间）

**Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: add all Rust dependencies"
```

---

### Task 2: error.rs — 统一错误类型

**Files:**
- Create: `src-tauri/src/error.rs`

**Step 1: 创建 error.rs**

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("LCU not connected")]
    LcuNotConnected,

    #[error("LCU request failed: {0}")]
    LcuRequest(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

// Tauri commands 必须返回实现 Serialize 的错误
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
```

**Step 2: 验证编译**

```bash
cd src-tauri && cargo check
```

期望：无错误

**Step 3: Commit**

```bash
git add src-tauri/src/error.rs
git commit -m "feat(rust): add unified AppError type"
```

---

### Task 3: lcu/connector.rs — LCU 进程检测

**Files:**
- Create: `src-tauri/src/lcu/mod.rs`
- Create: `src-tauri/src/lcu/connector.rs`

**Step 1: 创建 lcu/mod.rs**

```rust
pub mod connector;
pub mod client;
pub mod watcher;

pub use connector::{LcuAuth, LcuConnector, WindowsLcuConnector};
pub use client::LcuClient;
pub use watcher::{LcuEvent, LcuWatcher};
```

**Step 2: 创建 lcu/connector.rs**

```rust
use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD, Engine};
use sysinfo::System;

use crate::error::Result;

#[derive(Debug, Clone)]
pub struct LcuAuth {
    pub port: u16,
    pub token: String,
    /// "Basic <base64(riot:{token})>"
    pub auth_header: String,
}

impl LcuAuth {
    pub fn new(port: u16, token: String) -> Self {
        let encoded = STANDARD.encode(format!("riot:{token}"));
        Self {
            port,
            token,
            auth_header: format!("Basic {encoded}"),
        }
    }
}

#[async_trait]
pub trait LcuConnector: Send + Sync {
    /// 检测 LCU 进程，返回认证信息。None 表示未找到。
    async fn detect(&self) -> Option<LcuAuth>;
}

/// Windows 实现：读取 LeagueClientUx 进程命令行参数
pub struct WindowsLcuConnector;

#[async_trait]
impl LcuConnector for WindowsLcuConnector {
    async fn detect(&self) -> Option<LcuAuth> {
        let mut sys = System::new_all();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        for (_pid, process) in sys.processes() {
            if process.name().to_string_lossy().contains("LeagueClientUx") {
                let cmd: Vec<String> = process
                    .cmd()
                    .iter()
                    .map(|s| s.to_string_lossy().to_string())
                    .collect();

                let port = parse_arg(&cmd, "--app-port")?;
                let token = parse_arg(&cmd, "--remoting-auth-token")?;

                return Some(LcuAuth::new(
                    port.parse().ok()?,
                    token,
                ));
            }
        }
        None
    }
}

fn parse_arg(args: &[String], key: &str) -> Option<String> {
    args.iter().find_map(|arg| {
        let prefix = format!("{key}=");
        arg.strip_prefix(&prefix).map(|v| v.to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_arg_found() {
        let args = vec![
            "--app-port=12345".to_string(),
            "--remoting-auth-token=abc123".to_string(),
        ];
        assert_eq!(parse_arg(&args, "--app-port"), Some("12345".to_string()));
        assert_eq!(parse_arg(&args, "--remoting-auth-token"), Some("abc123".to_string()));
    }

    #[test]
    fn test_parse_arg_not_found() {
        let args = vec!["--other=value".to_string()];
        assert_eq!(parse_arg(&args, "--app-port"), None);
    }

    #[test]
    fn test_lcu_auth_header_format() {
        let auth = LcuAuth::new(12345, "mytoken".to_string());
        // "riot:mytoken" base64 encoded = "cmlvdDpteXRva2Vu"
        assert_eq!(auth.auth_header, "Basic cmlvdDpteXRva2Vu");
    }
}
```

**Step 3: 运行单元测试**

```bash
cd src-tauri && cargo test lcu::connector
```

期望：3 tests passed

**Step 4: Commit**

```bash
git add src-tauri/src/lcu/
git commit -m "feat(lcu): add LcuConnector trait and Windows implementation"
```

---

### Task 4: lcu/client.rs — HTTP 客户端

**Files:**
- Create: `src-tauri/src/lcu/client.rs`

**Step 1: 创建 lcu/client.rs**

```rust
use reqwest::{Client, Method};
use serde_json::Value;

use super::connector::LcuAuth;
use crate::error::{AppError, Result};

pub struct LcuClient {
    client: Client,
    base_url: String,
    auth: LcuAuth,
}

impl LcuClient {
    pub fn new(auth: LcuAuth) -> Result<Self> {
        // LCU 使用自签名证书，需要跳过验证
        let client = Client::builder()
            .danger_accept_invalid_certs(true)
            .build()
            .map_err(AppError::LcuRequest)?;

        Ok(Self {
            client,
            base_url: format!("https://127.0.0.1:{}", auth.port),
            auth,
        })
    }

    pub fn auth(&self) -> &LcuAuth {
        &self.auth
    }

    pub async fn request(&self, method: Method, path: &str, body: Option<Value>) -> Result<Value> {
        let mut req = self
            .client
            .request(method, format!("{}{path}", self.base_url))
            .header("Authorization", &self.auth.auth_header)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json");

        if let Some(body) = body {
            req = req.json(&body);
        }

        let resp = req.send().await?;
        let json: Value = resp.json().await?;
        Ok(json)
    }

    pub async fn get(&self, path: &str) -> Result<Value> {
        self.request(Method::GET, path, None).await
    }

    pub async fn post(&self, path: &str, body: Value) -> Result<Value> {
        self.request(Method::POST, path, Some(body)).await
    }

    pub async fn put(&self, path: &str, body: Value) -> Result<Value> {
        self.request(Method::PUT, path, Some(body)).await
    }

    pub async fn patch(&self, path: &str, body: Value) -> Result<Value> {
        self.request(Method::PATCH, path, Some(body)).await
    }

    pub async fn delete(&self, path: &str) -> Result<Value> {
        self.request(Method::DELETE, path, None).await
    }
}
```

**Step 2: 验证编译**

```bash
cd src-tauri && cargo check
```

期望：无错误

**Step 3: Commit**

```bash
git add src-tauri/src/lcu/client.rs
git commit -m "feat(lcu): add LcuClient HTTP wrapper"
```

---

### Task 5: lcu/watcher.rs — WebSocket 事件监听

**Files:**
- Create: `src-tauri/src/lcu/watcher.rs`

**Step 1: 创建 lcu/watcher.rs**

```rust
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri::Emitter;
use tokio_tungstenite::{
    connect_async_tls_with_config,
    tungstenite::Message,
    Connector,
};

use super::connector::LcuAuth;
use crate::error::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LcuEvent {
    /// LCU 事件类型，如 "Update", "Create", "Delete"
    #[serde(rename = "eventType")]
    pub event_type: String,
    /// API 路径，如 "/lol/gameflow/v1/gameflow-phase"
    pub uri: String,
    /// 事件数据
    pub data: Value,
}

pub struct LcuWatcher;

impl LcuWatcher {
    /// 连接 LCU WebSocket，将事件 emit 给前端并通过回调通知模块。
    /// 此函数阻塞直到连接断开。
    pub async fn run<F>(auth: &LcuAuth, app: &AppHandle, on_event: F) -> Result<()>
    where
        F: Fn(LcuEvent) + Send + Sync + 'static,
    {
        let url = format!("wss://127.0.0.1:{}/", auth.port);

        // 跳过自签名证书验证
        let connector = Connector::NativeTls(
            native_tls::TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .build()
                .map_err(|e| crate::error::AppError::Other(e.to_string()))?,
        );

        let request = {
            use tokio_tungstenite::tungstenite::client::IntoClientRequest;
            let mut req = url.into_client_request()
                .map_err(|e| crate::error::AppError::Other(e.to_string()))?;
            req.headers_mut().insert(
                "Authorization",
                auth.auth_header.parse().unwrap(),
            );
            req
        };

        let (mut ws, _) = connect_async_tls_with_config(request, None, false, Some(connector))
            .await
            .map_err(|e| crate::error::AppError::Other(e.to_string()))?;

        // 订阅所有 JSON API 事件
        let subscribe_msg = serde_json::json!([5, "OnJsonApiEvent"]).to_string();
        ws.send(Message::Text(subscribe_msg.into())).await
            .map_err(|e| crate::error::AppError::Other(e.to_string()))?;

        while let Some(msg) = ws.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(Value::Array(arr)) = serde_json::from_str::<Value>(&text) {
                        if arr.len() >= 3 {
                            if let Ok(event) = serde_json::from_value::<LcuEvent>(arr[2].clone()) {
                                // 推送给前端
                                let _ = app.emit("lcu-event", &event);
                                // 通知模块
                                on_event(event);
                            }
                        }
                    }
                }
                Ok(Message::Close(_)) | Err(_) => break,
                _ => {}
            }
        }

        Ok(())
    }
}
```

**注意**：需要在 Cargo.toml 补充 `native-tls` 依赖：

```toml
native-tls = "0.2"
```

**Step 2: 验证编译**

```bash
cd src-tauri && cargo check
```

期望：无错误

**Step 3: Commit**

```bash
git add src-tauri/src/lcu/watcher.rs src-tauri/Cargo.toml
git commit -m "feat(lcu): add LcuWatcher WebSocket subscriber"
```

---

### Task 6: storage/ — 数据持久化层

**Files:**
- Create: `src-tauri/src/storage/mod.rs`
- Create: `src-tauri/src/storage/db.rs`
- Create: `src-tauri/src/storage/store.rs`

**Step 1: 创建 storage/mod.rs**

```rust
pub mod db;
pub mod store;

pub use db::SqliteDb;
pub use store::StoreManager;
```

**Step 2: 创建 storage/db.rs**

```rust
use rusqlite::{Connection, params};
use std::sync::Mutex;

use crate::error::{AppError, Result};

pub struct SqliteDb {
    conn: Mutex<Connection>,
}

impl SqliteDb {
    /// 打开（或创建）数据库，执行 migration。
    pub fn open(path: &std::path::Path) -> Result<Self> {
        let conn = Connection::open(path)?;

        // 开启 WAL 模式提升并发性能
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // 获取当前 schema 版本
        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap_or(0);

        if version < 1 {
            conn.execute_batch("
                CREATE TABLE IF NOT EXISTS saved_players (
                    puuid       TEXT PRIMARY KEY,
                    note        TEXT NOT NULL DEFAULT '',
                    tag         TEXT NOT NULL DEFAULT '',
                    first_seen  INTEGER NOT NULL,
                    last_seen   INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS encountered_games (
                    game_id     INTEGER PRIMARY KEY,
                    puuids      TEXT NOT NULL,  -- JSON array
                    played_at   INTEGER NOT NULL
                );

                PRAGMA user_version = 1;
            ")?;
        }

        Ok(())
    }

    /// 通用查询接口，返回 JSON 行数组
    pub fn query_raw(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<serde_json::Value>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(sql)?;
        let col_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

        let rows = stmt.query_map(rusqlite::params_from_iter(params.iter()), |row| {
            let mut map = serde_json::Map::new();
            for (i, name) in col_names.iter().enumerate() {
                let val: rusqlite::types::Value = row.get(i)?;
                map.insert(name.clone(), rusqlite_to_json(val));
            }
            Ok(serde_json::Value::Object(map))
        })?;

        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(AppError::Database)
    }

    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        Ok(conn.execute(sql, rusqlite::params_from_iter(params.iter()))?)
    }
}

fn rusqlite_to_json(val: rusqlite::types::Value) -> serde_json::Value {
    match val {
        rusqlite::types::Value::Null => serde_json::Value::Null,
        rusqlite::types::Value::Integer(i) => serde_json::Value::Number(i.into()),
        rusqlite::types::Value::Real(f) => serde_json::json!(f),
        rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
        rusqlite::types::Value::Blob(b) => serde_json::Value::String(base64::engine::general_purpose::STANDARD.encode(b)),
    }
}
```

**Step 3: 创建 storage/store.rs**

```rust
use tauri::AppHandle;

/// tauri-plugin-store 的轻量封装
/// 实际调用委托给 tauri-plugin-store 的 JavaScript 侧，
/// 此处仅作占位，Rust 直接访问 store 需要 plugin 提供的 StoreExt。
pub struct StoreManager {
    #[allow(dead_code)]
    app: AppHandle,
}

impl StoreManager {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}
```

**Step 4: 验证编译**

```bash
cd src-tauri && cargo check
```

期望：无错误

**Step 5: Commit**

```bash
git add src-tauri/src/storage/
git commit -m "feat(storage): add SqliteDb with migration and StoreManager stub"
```

---

### Task 7: state.rs — 全局共享状态

**Files:**
- Create: `src-tauri/src/state.rs`

**Step 1: 创建 state.rs**

```rust
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::RwLock;

use crate::lcu::{LcuAuth, LcuClient};
use crate::storage::{SqliteDb, StoreManager};
use crate::error::Result;

pub struct AppState {
    pub app: AppHandle,
    pub lcu_client: RwLock<Option<Arc<LcuClient>>>,
    pub lcu_auth: RwLock<Option<LcuAuth>>,
    pub db: Arc<SqliteDb>,
    pub store: Arc<StoreManager>,
}

impl AppState {
    pub fn new(app: &AppHandle, db: SqliteDb) -> Self {
        Self {
            app: app.clone(),
            lcu_client: RwLock::new(None),
            lcu_auth: RwLock::new(None),
            db: Arc::new(db),
            store: Arc::new(StoreManager::new(app.clone())),
        }
    }

    /// LCU 连接成功时调用
    pub async fn set_lcu_connected(&self, auth: LcuAuth) -> Result<()> {
        let client = LcuClient::new(auth.clone())?;
        *self.lcu_client.write().await = Some(Arc::new(client));
        *self.lcu_auth.write().await = Some(auth);
        Ok(())
    }

    /// LCU 断开时调用
    pub async fn set_lcu_disconnected(&self) {
        *self.lcu_client.write().await = None;
        *self.lcu_auth.write().await = None;
    }

    /// 获取 LCU 客户端（未连接时返回 None）
    pub async fn lcu(&self) -> Option<Arc<LcuClient>> {
        self.lcu_client.read().await.clone()
    }
}
```

**Step 2: 验证编译**

```bash
cd src-tauri && cargo check
```

期望：无错误

**Step 3: Commit**

```bash
git add src-tauri/src/state.rs
git commit -m "feat(rust): add AppState with LCU connection management"
```

---

### Task 8: shards/mod.rs — Shard trait 定义

**Files:**
- Create: `src-tauri/src/shards/mod.rs`

**Step 1: 创建 shards/mod.rs**

```rust
use std::sync::Arc;

use async_trait::async_trait;
use tauri::AppHandle;

use crate::error::Result;
use crate::lcu::LcuEvent;
use crate::state::AppState;

// 子模块声明
pub mod auto_gameflow;
pub mod auto_reply;
pub mod auto_select;
pub mod keyboard;
pub mod ongoing_game;
pub mod saved_player;
pub mod statistics;
pub mod tray;
pub mod updater;

/// 所有功能 shard 必须实现的 trait
#[async_trait]
pub trait Shard: Send + Sync {
    /// Shard 唯一标识符
    fn name(&self) -> &'static str;

    /// 应用启动时初始化（注册 Tauri 命令、加载配置等）
    async fn setup(&self, app: &AppHandle, state: Arc<AppState>) -> Result<()>;

    /// LCU 连接建立时调用
    async fn on_lcu_connected(&self, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }

    /// LCU 断开时调用
    async fn on_lcu_disconnected(&self, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }

    /// 接收 LCU WebSocket 事件
    async fn on_lcu_event(&self, _event: &LcuEvent, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }
}
```

**Step 2: Commit**

```bash
git add src-tauri/src/shards/mod.rs
git commit -m "feat(shards): add Shard trait definition"
```

---

### Task 9: 所有 Shard 存根

为每个 shard 创建最小实现，仅实现 `name()` 和空 `setup()`。

**Files（每个 shard 一个文件）:**
- Create: `src-tauri/src/shards/auto_select.rs`
- Create: `src-tauri/src/shards/auto_gameflow.rs`
- Create: `src-tauri/src/shards/auto_reply.rs`
- Create: `src-tauri/src/shards/ongoing_game.rs`
- Create: `src-tauri/src/shards/saved_player.rs`
- Create: `src-tauri/src/shards/statistics.rs`
- Create: `src-tauri/src/shards/keyboard.rs`
- Create: `src-tauri/src/shards/tray.rs`
- Create: `src-tauri/src/shards/updater.rs`

**Step 1: 对每个 shard，按下方模板创建文件**（将 `AutoSelect` / `auto_select` 替换为对应名称）

```rust
// src-tauri/src/shards/auto_select.rs
use std::sync::Arc;
use async_trait::async_trait;
use tauri::AppHandle;

use crate::error::Result;
use crate::state::AppState;
use super::Shard;

pub struct AutoSelectShard;

impl AutoSelectShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for AutoSelectShard {
    fn name(&self) -> &'static str {
        "auto-select"
    }

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.name());
        Ok(())
    }
}
```

各 shard 对应的 `name()` 返回值：

| 文件 | name() |
|------|--------|
| `auto_select.rs` | `"auto-select"` |
| `auto_gameflow.rs` | `"auto-gameflow"` |
| `auto_reply.rs` | `"auto-reply"` |
| `ongoing_game.rs` | `"ongoing-game"` |
| `saved_player.rs` | `"saved-player"` |
| `statistics.rs` | `"statistics"` |
| `keyboard.rs` | `"keyboard"` |
| `tray.rs` | `"tray"` |
| `updater.rs` | `"updater"` |

**Step 2: 验证编译**

```bash
cd src-tauri && cargo check
```

期望：无错误

**Step 3: Commit**

```bash
git add src-tauri/src/shards/
git commit -m "feat(shards): add all Shard stubs"
```

---

### Task 10: lib.rs — 组装所有 Shard

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: 替换 lib.rs 内容**

```rust
mod error;
mod lcu;
mod shards;
mod state;
mod storage;

use std::sync::Arc;

use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{sleep, Duration};

use lcu::{LcuConnector, LcuWatcher, WindowsLcuConnector};
use shards::Shard;
use state::AppState;
use storage::SqliteDb;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化 tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "league_jax_lib=debug".into()),
        )
        .init();

    // 注册所有 shard（编译期静态）
    let shards: Vec<Arc<dyn Shard>> = vec![
        Arc::new(shards::auto_select::AutoSelectShard::new()),
        Arc::new(shards::auto_gameflow::AutoGameflowShard::new()),
        Arc::new(shards::auto_reply::AutoReplyShard::new()),
        Arc::new(shards::ongoing_game::OngoingGameShard::new()),
        Arc::new(shards::saved_player::SavedPlayerShard::new()),
        Arc::new(shards::statistics::StatisticsShard::new()),
        Arc::new(shards::keyboard::KeyboardShard::new()),
        Arc::new(shards::tray::TrayShard::new()),
        Arc::new(shards::updater::UpdaterShard::new()),
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // 初始化 SQLite
            let data_dir = app.path().app_data_dir().expect("no app data dir");
            std::fs::create_dir_all(&data_dir)?;
            let db = SqliteDb::open(&data_dir.join("league-jax.db"))
                .expect("failed to open database");

            let state = Arc::new(AppState::new(&app_handle, db));

            // setup 所有 shard
            for shard in &shards {
                let shard = shard.clone();
                let state = state.clone();
                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = shard.setup(&app_handle, state).await {
                        tracing::error!("[{}] setup failed: {e}", shard.name());
                    }
                });
            }

            // 启动 LCU 连接监视器
            tauri::async_runtime::spawn(lcu_watcher_loop(
                app_handle.clone(),
                state.clone(),
                shards.clone(),
            ));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 轮询 LCU 进程，管理连接生命周期
async fn lcu_watcher_loop(
    app: AppHandle,
    state: Arc<AppState>,
    shards: Vec<Arc<dyn Shard>>,
) {
    let connector = WindowsLcuConnector;
    let mut connected = false;

    loop {
        let auth = connector.detect().await;

        match (connected, auth) {
            // 新连接
            (false, Some(auth)) => {
                tracing::info!("LCU connected on port {}", auth.port);
                if let Err(e) = state.set_lcu_connected(auth.clone()).await {
                    tracing::error!("set_lcu_connected failed: {e}");
                    sleep(Duration::from_secs(2)).await;
                    continue;
                }

                // 通知各 shard
                for shard in &shards {
                    if let Err(e) = shard.on_lcu_connected(state.clone()).await {
                        tracing::error!("[{}] on_lcu_connected: {e}", shard.name());
                    }
                }

                let _ = app.emit("lcu-connected", &serde_json::json!({ "port": auth.port }));
                connected = true;

                // 启动 WebSocket 监听（阻塞直到断开）
                let shards_clone = shards.clone();
                let state_clone = state.clone();
                let app_clone = app.clone();
                let _ = LcuWatcher::run(&auth, &app_clone, move |event| {
                    let shards = shards_clone.clone();
                    let state = state_clone.clone();
                    tauri::async_runtime::spawn(async move {
                        for shard in &shards {
                            if let Err(e) = shard.on_lcu_event(&event, state.clone()).await {
                                tracing::error!("[{}] on_lcu_event: {e}", shard.name());
                            }
                        }
                    });
                })
                .await;

                // WebSocket 断开
                tracing::info!("LCU disconnected");
                state.set_lcu_disconnected().await;
                for shard in &shards {
                    if let Err(e) = shard.on_lcu_disconnected(state.clone()).await {
                        tracing::error!("[{}] on_lcu_disconnected: {e}", shard.name());
                    }
                }
                let _ = app.emit("lcu-disconnected", ());
                connected = false;
            }

            // 已连接但进程消失（由 WS 断开处理，此处无需额外操作）
            (true, None) => {
                connected = false;
            }

            _ => {}
        }

        sleep(Duration::from_millis(500)).await;
    }
}
```

**Step 2: 完整编译检查**

```bash
cd src-tauri && cargo check
```

期望：无错误

**Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(rust): wire all modules into Tauri builder with LCU watcher loop"
```

---

## Phase 2: 前端

### Task 11: 安装前端依赖

**Step 1: 安装运行时依赖**

```bash
bun add @tanstack/react-router @tanstack/react-query @tanstack/router-devtools @tanstack/react-query-devtools zustand i18next react-i18next
```

**Step 2: 安装开发依赖**

```bash
bun add -d @tanstack/router-plugin tailwindcss @tailwindcss/vite
```

**Step 3: 初始化 shadcn/ui**

```bash
bunx shadcn@latest init
```

选项：
- Style: `New York`
- Base color: `Zinc`
- CSS variables: `yes`

**Step 4: 更新 vite.config.ts 加入 TanStack Router 插件**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [
    TanStackRouterVite({ routesDirectory: "./src/routes" }),
    react(),
    tailwindcss(),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
```

**Step 5: 验证前端可以启动**

```bash
bun run dev
```

期望：Vite 在 http://localhost:1420 启动无报错

**Step 6: Commit**

```bash
git add package.json bun.lock vite.config.ts src/index.css components.json
git commit -m "chore(frontend): install TanStack Router/Query, Zustand, i18next, shadcn/ui, Tailwind"
```

---

### Task 12: i18n 初始化

**Files:**
- Create: `src/i18n/index.ts`
- Create: `src/i18n/locales/zh-CN.json`
- Create: `src/i18n/locales/en.json`

**Step 1: 创建 src/i18n/locales/zh-CN.json**

```json
{
  "common": {
    "connected": "已连接",
    "disconnected": "未连接",
    "enabled": "已启用",
    "disabled": "已禁用",
    "save": "保存",
    "cancel": "取消"
  },
  "nav": {
    "dashboard": "概览",
    "autoSelect": "自动选英雄",
    "autoGameflow": "自动接受",
    "autoReply": "自动回复",
    "ongoingGame": "当前对局",
    "savedPlayers": "记录的玩家",
    "statistics": "战绩统计",
    "settings": "设置"
  }
}
```

**Step 2: 创建 src/i18n/locales/en.json**

```json
{
  "common": {
    "connected": "Connected",
    "disconnected": "Disconnected",
    "enabled": "Enabled",
    "disabled": "Disabled",
    "save": "Save",
    "cancel": "Cancel"
  },
  "nav": {
    "dashboard": "Dashboard",
    "autoSelect": "Auto Select",
    "autoGameflow": "Auto Accept",
    "autoReply": "Auto Reply",
    "ongoingGame": "Ongoing Game",
    "savedPlayers": "Saved Players",
    "statistics": "Statistics",
    "settings": "Settings"
  }
}
```

**Step 3: 创建 src/i18n/index.ts**

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import zhCN from "./locales/zh-CN.json";
import en from "./locales/en.json";

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
  },
  lng: "zh-CN",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
```

**Step 4: Commit**

```bash
git add src/i18n/
git commit -m "feat(i18n): add i18next with zh-CN and en locales"
```

---

### Task 13: Zustand stores

**Files:**
- Create: `src/stores/lcu.ts`
- Create: `src/stores/app.ts`

**Step 1: 创建 src/stores/lcu.ts**

```typescript
import { create } from "zustand";

interface LcuState {
  connected: boolean;
  port: number | null;
  setConnected: (port: number) => void;
  setDisconnected: () => void;
}

export const useLcuStore = create<LcuState>((set) => ({
  connected: false,
  port: null,
  setConnected: (port) => set({ connected: true, port }),
  setDisconnected: () => set({ connected: false, port: null }),
}));
```

**Step 2: 创建 src/stores/app.ts**

```typescript
import { create } from "zustand";

interface AppState {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: "zh-CN",
  setLanguage: (language) => set({ language }),
}));
```

**Step 3: Commit**

```bash
git add src/stores/
git commit -m "feat(frontend): add Zustand stores for LCU connection and app state"
```

---

### Task 14: Tauri event hooks

**Files:**
- Create: `src/hooks/use-lcu-events.ts`

**Step 1: 创建 src/hooks/use-lcu-events.ts**

```typescript
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useLcuStore } from "../stores/lcu";

export function useLcuEvents() {
  const { setConnected, setDisconnected } = useLcuStore();

  useEffect(() => {
    const unlisteners = [
      listen<{ port: number }>("lcu-connected", (e) => {
        setConnected(e.payload.port);
      }),
      listen("lcu-disconnected", () => {
        setDisconnected();
      }),
    ];

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [setConnected, setDisconnected]);
}
```

**Step 2: Commit**

```bash
git add src/hooks/
git commit -m "feat(frontend): add useLcuEvents hook for Tauri event subscription"
```

---

### Task 15: TanStack Router 文件路由结构

TanStack Router 的 `TanStackRouterVite` 插件会根据 `src/routes/` 下的文件自动生成路由。

**Files:**
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Create: `src/routes/auto-select.tsx`
- Create: `src/routes/auto-gameflow.tsx`
- Create: `src/routes/auto-reply.tsx`
- Create: `src/routes/ongoing-game.tsx`
- Create: `src/routes/saved-players.tsx`
- Create: `src/routes/statistics.tsx`
- Create: `src/routes/settings.tsx`

**Step 1: 创建 src/routes/__root.tsx（根布局）**

```tsx
import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { useTranslation } from "react-i18next";
import { useLcuEvents } from "../hooks/use-lcu-events";
import { useLcuStore } from "../stores/lcu";

function RootLayout() {
  const { t } = useTranslation();
  const connected = useLcuStore((s) => s.connected);
  useLcuEvents();

  const navItems = [
    { to: "/", label: t("nav.dashboard") },
    { to: "/auto-select", label: t("nav.autoSelect") },
    { to: "/auto-gameflow", label: t("nav.autoGameflow") },
    { to: "/auto-reply", label: t("nav.autoReply") },
    { to: "/ongoing-game", label: t("nav.ongoingGame") },
    { to: "/saved-players", label: t("nav.savedPlayers") },
    { to: "/statistics", label: t("nav.statistics") },
    { to: "/settings", label: t("nav.settings") },
  ] as const;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* 侧边栏 */}
      <aside className="w-48 border-r flex flex-col">
        <div className="p-4 text-sm font-semibold border-b">LeagueJax</div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block px-3 py-2 rounded-md text-sm hover:bg-accent"
              activeProps={{ className: "bg-accent font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {/* 状态栏 */}
        <div className="p-3 border-t text-xs text-muted-foreground">
          {connected ? (
            <span className="text-green-500">{t("common.connected")}</span>
          ) : (
            <span>{t("common.disconnected")}</span>
          )}
        </div>
      </aside>

      {/* 内容区 */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
}

export const Route = createRootRoute({ component: RootLayout });
```

**Step 2: 创建各页面存根（以 index.tsx 为例，其余同理）**

`src/routes/index.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";

function Dashboard() {
  return <div className="text-xl font-semibold">Dashboard</div>;
}

export const Route = createFileRoute("/")({ component: Dashboard });
```

对 `auto-select.tsx` / `auto-gameflow.tsx` / `auto-reply.tsx` / `ongoing-game.tsx` / `saved-players.tsx` / `statistics.tsx` / `settings.tsx` 重复此模式，将组件名和路由路径替换。

**Step 3: Commit**

```bash
git add src/routes/
git commit -m "feat(frontend): add TanStack Router file routes with sidebar layout"
```

---

### Task 16: 更新 main.tsx 和 App.tsx

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

**Step 1: 替换 src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "../src/i18n"; // 初始化 i18n
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 2: 替换 src/App.tsx**

```tsx
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen"; // 自动生成

const router = createRouter({ routeTree });
const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

**Step 3: 启动验证**

```bash
bun run dev
```

期望：应用在浏览器中显示侧边栏 + Dashboard 页面，无控制台错误

**Step 4: Commit**

```bash
git add src/main.tsx src/App.tsx src/routeTree.gen.ts
git commit -m "feat(frontend): wire TanStack Router and Query into app entry"
```

---

### Task 17: 完整 Tauri 开发环境验证

**Step 1: 运行完整 Tauri 开发模式**

```bash
bunx tauri dev
```

期望：
- Vite 在 1420 端口启动
- Rust 编译成功（首次较慢，约 2-5 分钟）
- 桌面窗口弹出，显示侧边栏和 Dashboard 页面
- 底部状态栏显示"未连接"
- 如果开着 League Client，状态栏应变为"已连接"

**Step 2: 最终 Commit**

```bash
git add .
git commit -m "chore: verified full Tauri dev environment runs correctly"
```

---

## 完成后的状态

骨架完成后，项目具备：

- **Rust 后端**：完整的 Module trait 体系、LCU 连接/断开生命周期、WebSocket 事件分发、SQLite 数据库、9 个模块存根
- **前端**：TanStack Router 文件路由、shadcn/ui + Tailwind、i18next 多语言、Zustand 状态、LCU 事件监听、完整侧边栏布局、8 个页面存根
- **扩展起点**：向任意模块添加 `on_lcu_event` 实现即可激活功能；向任意页面添加 TanStack Query 调用即可展示数据
