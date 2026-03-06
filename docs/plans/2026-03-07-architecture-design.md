# LeagueJax 架构设计文档

**日期**：2026-03-07
**技术栈**：Tauri v2 + React 19 + Rust
**参考项目**：[LeagueAkari](https://github.com/LeagueAkari/LeagueAkari)（Electron + Vue）

---

## 1. 技术选型

| 层次 | 选型 |
|------|------|
| 桌面框架 | Tauri v2 |
| 前端框架 | React 19 + TypeScript |
| UI 组件库 | shadcn/ui + Tailwind CSS |
| 前端路由 | TanStack Router |
| 服务端状态 | TanStack Query |
| 客户端状态 | Zustand |
| 国际化 | i18next + react-i18next |
| 后端语言 | Rust |
| 持久化（配置） | tauri-plugin-store（JSON） |
| 持久化（数据） | SQLite（rusqlite） |
| 目标平台 | Windows（保留 macOS 扩展接口） |
| 包管理器 | bun |

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│                                                          │
│  TanStack Router  │  TanStack Query  │  Zustand         │
│  shadcn/ui + Tailwind CSS  │  i18next                   │
└────────────┬────────────────────────▲────────────────────┘
             │ invoke(cmd, args)      │ emit(event, payload)
             ▼                        │
┌─────────────────────────────────────────────────────────┐
│                  Tauri Command Layer                     │
│   每个 Shard 在 setup() 中注册自己的 #[tauri::command]   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  Shard Registry                          │
│                                                          │
│  AutoSelectShard    AutoGameflowShard                    │
│  AutoReplyShard     OngoingGameShard                     │
│  SavedPlayerShard   StatisticsShard                      │
│  KeyboardShard      UpdaterShard    TrayShard ...        │
│                                                          │
│  所有 Shard 实现 Shard trait，在 lib.rs 编译期静态注册   │
└────────────────────────┬────────────────────────────────┘
                         │ 共享 AppState
┌────────────────────────▼────────────────────────────────┐
│                    Core Layer                            │
│                                                          │
│  LcuConnector (trait)   LcuClient (HTTP reqwest)        │
│  LcuWatcher (WebSocket) AppState (Arc<Mutex<T>>)        │
│  Storage: SqliteDb + StoreManager                       │
└─────────────────────────────────────────────────────────┘
                         │
                   League Client
                  (LCU HTTP + WS)
```

---

## 3. Shard trait 设计

所有功能模块实现统一 `Shard` trait，编译期静态注册，无动态加载。目录为 `src-tauri/src/shards/`，结构体命名为 `XxxShard`。

```rust
// src-tauri/src/shards/mod.rs

#[async_trait]
pub trait Shard: Send + Sync {
    /// Shard 唯一标识
    fn name(&self) -> &'static str;

    /// 应用启动时初始化：注册事件监听、加载配置
    async fn setup(&self, app: &AppHandle, state: Arc<AppState>) -> Result<()>;

    /// LCU 连接建立时调用
    async fn on_lcu_connected(&self, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }

    /// LCU 断开时调用
    async fn on_lcu_disconnected(&self, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }

    /// 接收 LCU WebSocket 事件（由 LcuWatcher 路由分发）
    async fn on_lcu_event(&self, _event: &LcuEvent, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }
}
```

**注册示例**（`lib.rs`）：

```rust
pub fn run() {
    let shards: Vec<Arc<dyn Shard>> = vec![
        Arc::new(shards::auto_select::AutoSelectShard::new()),
        Arc::new(shards::auto_gameflow::AutoGameflowShard::new()),
        Arc::new(shards::ongoing_game::OngoingGameShard::new()),
        Arc::new(shards::saved_player::SavedPlayerShard::new()),
        Arc::new(shards::statistics::StatisticsShard::new()),
        Arc::new(shards::tray::TrayShard::new()),
        Arc::new(shards::keyboard::KeyboardShard::new()),
        Arc::new(shards::updater::UpdaterShard::new()),
    ];

    tauri::Builder::default()
        .setup(move |app| {
            let state = Arc::new(AppState::new(app.handle(), db)?);
            for shard in &shards {
                tauri::async_runtime::spawn(shard.setup(app.handle(), state.clone()));
            }
            // 启动 LCU 连接监视器
            tauri::async_runtime::spawn(lcu_watcher_loop(app.handle().clone(), state, shards));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}
```

---

## 4. LCU 连接层

### 4.1 LcuConnector trait（平台抽象）

```rust
// src-tauri/src/lcu/connector.rs

#[async_trait]
pub trait LcuConnector: Send + Sync {
    /// 轮询检测 LCU 进程，返回认证信息
    async fn detect(&self) -> Option<LcuAuth>;
}

pub struct LcuAuth {
    pub port: u16,
    pub token: String,  // Basic auth token from lockfile/process args
}

// Windows 实现：读取 LeagueClientUx 进程命令行参数
pub struct WindowsLcuConnector;

// macOS 预留接口（读取 lockfile）
pub struct MacOsLcuConnector;
```

### 4.2 LcuClient（HTTP）

- 基于 `reqwest`，使用 `Basic` auth（`riot:{token}` base64）
- 忽略 LCU 自签名证书（`danger_accept_invalid_certs`）
- 封装 `get / post / put / patch / delete`，返回 `serde_json::Value`

### 4.3 LcuWatcher（WebSocket）

- 连接 `wss://127.0.0.1:{port}/`
- 订阅 `OnJsonApiEvent`（全量事件）
- 按 `uri` 前缀路由给各模块的 `on_lcu_event()`
- 同时通过 `app.emit_all("lcu-event", payload)` 推送给前端

### 4.4 连接生命周期

```
启动 → LcuConnector 轮询（500ms）
     → 检测到进程 → 创建 LcuClient + LcuWatcher
     → 通知所有模块 on_lcu_connected()
     → emit("lcu-connected", auth_info) 到前端
     → LCU 进程消失 → 通知所有模块 on_lcu_disconnected()
     → emit("lcu-disconnected") 到前端
     → 重新开始轮询
```

---

## 5. AppState 设计

```rust
// src-tauri/src/state.rs

pub struct AppState {
    pub lcu_client: RwLock<Option<Arc<LcuClient>>>,
    pub lcu_auth:   RwLock<Option<LcuAuth>>,
    pub db:         Arc<SqliteDb>,
    pub store:      Arc<StoreManager>,
    pub app:        AppHandle,
}
```

各模块通过 `Arc<AppState>` 访问共享资源，不直接持有 LCU 客户端引用。

---

## 6. 数据持久化

### 6.1 SQLite（增量/关系型数据）

| 表 | 用途 |
|----|------|
| `saved_players` | puuid、备注、标签、首次/末次遇到时间 |
| `encountered_games` | gameId、遇到的 puuid 列表、时间戳 |
| `metadata` | schema 版本号，用于 migration |

migration 策略：启动时检查 `metadata.schema_version`，按序执行 `upgrades/` 下的脚本。

### 6.2 tauri-plugin-store（模块配置）

每个模块独立的 JSON store 文件，如：
- `auto-select.json` → 英雄优先级列表、自动禁用配置
- `auto-gameflow.json` → 自动接受开关、秒退阈值
- `app.json` → 语言、主题、窗口配置

---

## 7. 前端结构

```
src/
├── main.tsx
├── App.tsx                      # Router + QueryClient Provider
├── routes/                      # TanStack Router 文件路由
│   ├── __root.tsx               # 根布局（侧边栏 + 内容区）
│   ├── index.tsx                # Dashboard
│   ├── auto-select/
│   ├── auto-gameflow/
│   ├── auto-reply/
│   ├── ongoing-game/
│   ├── saved-players/
│   ├── statistics/
│   └── settings/
├── components/
│   ├── layout/                  # Sidebar, Header, StatusBar
│   └── lcu/                    # LcuStatusBadge, ChampionIcon 等
├── hooks/
│   ├── use-lcu-event.ts         # 订阅 Tauri emit 的 LCU 事件
│   ├── use-lcu-connected.ts     # 连接状态
│   └── use-invoke.ts            # invoke() 类型安全封装
├── stores/
│   ├── lcu.ts                   # 连接状态、当前 gameflow
│   └── app.ts                   # 主题、语言
├── services/                    # invoke() 调用的类型化封装
│   ├── lcu.ts
│   └── shards/
│       ├── auto-select.ts
│       └── auto-gameflow.ts
└── i18n/
    ├── index.ts
    └── locales/
        ├── zh-CN.json
        └── en.json
```

### 前端与 Rust 的事件约定

| Tauri Event | 触发方 | 数据 |
|-------------|--------|------|
| `lcu-connected` | LcuWatcher | `{ port, region }` |
| `lcu-disconnected` | LcuWatcher | — |
| `lcu-event` | LcuWatcher | `{ uri, eventType, data }` |
| `module-log` | 各 Shard | `{ shard, level, message }` |

---

## 8. 项目目录结构

```
league-jax/
├── src/                              # React 前端（见第 7 节）
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                   # 入口，调用 lib::run()
│   │   ├── lib.rs                    # Shard 注册 + Tauri Builder
│   │   ├── error.rs                  # 统一 AppError 类型
│   │   ├── state.rs                  # AppState
│   │   ├── lcu/
│   │   │   ├── mod.rs
│   │   │   ├── connector.rs          # LcuConnector trait + Windows 实现
│   │   │   ├── client.rs             # HTTP client (reqwest)
│   │   │   └── watcher.rs            # WebSocket 订阅 + 事件分发
│   │   ├── shards/
│   │   │   ├── mod.rs                # Shard trait 定义
│   │   │   ├── auto_select.rs
│   │   │   ├── auto_gameflow.rs
│   │   │   ├── auto_reply.rs
│   │   │   ├── ongoing_game.rs
│   │   │   ├── saved_player.rs
│   │   │   ├── statistics.rs
│   │   │   ├── keyboard.rs
│   │   │   ├── tray.rs
│   │   │   └── updater.rs
│   │   └── storage/
│   │       ├── mod.rs
│   │       ├── db.rs                 # SqliteDb + migration
│   │       └── store.rs              # StoreManager 封装
│   ├── capabilities/
│   │   └── default.json
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
│   └── plans/
│       └── 2026-03-07-architecture-design.md  # 本文件
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── CLAUDE.md
```

---

## 9. Rust 依赖清单

```toml
[dependencies]
tauri              = { version = "2", features = ["tray-icon"] }
tauri-plugin-store = "2"
tauri-plugin-autostart       = "2"
tauri-plugin-global-shortcut = "2"
tauri-plugin-updater         = "2"

reqwest            = { version = "0.12", features = ["json", "rustls-tls"] }
tokio-tungstenite  = { version = "0.24", features = ["rustls-tls-webpki-roots"] }
tokio              = { version = "1", features = ["full"] }
serde              = { version = "1", features = ["derive"] }
serde_json         = "1"
rusqlite           = { version = "0.31", features = ["bundled"] }
async-trait        = "0.1"
sysinfo            = "0.30"   # 读取 LCU 进程参数（Windows）
base64             = "0.22"
thiserror          = "1"
```

---

## 10. 关键设计决策记录

| 决策 | 原因 |
|------|------|
| 静态 Shard 式而非平铺模块 | 统一生命周期管理（connected/disconnected/event），Shard 间零耦合 |
| trait 名用 `Shard` 而非 `Module` | 避免与 Rust `mod` 概念混淆，与 LeagueAkari 领域命名一致 |
| 不用动态加载 | Rust 无成熟 dlopen 生态，编译期注册够用且安全 |
| LcuConnector 用 trait 抽象 | Windows 读进程参数，macOS 读 lockfile，逻辑不同但接口一致 |
| SQLite + Store 混合存储 | 配置简单用 JSON，关系型/增量数据用 SQLite，各司其职 |
| TanStack Router + Query | 两者配套，类型安全，与 Tauri invoke 封装自然结合 |
| i18next key-based | 从第一行代码开始支持多语言，避免后期大规模替换字符串 |
