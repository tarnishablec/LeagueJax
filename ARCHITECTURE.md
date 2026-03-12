# LeagueJax Architecture

Tauri v2 桌面应用，前端 React 19 + TypeScript，后端 Rust + Tokio 异步运行时。

## 整体分层

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (WebView)                   │
│                                                          │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌───────────┐   │
│  │ Routes  │  │  Stores  │  │  Hooks  │  │ Features  │   │
│  │TanStack │  │ Zustand  │  │         │  │ (WebShard)│   │
│  │ Router  │  │          │  │         │  │           │   │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬────┘   │
│       │            │             │              │        │
│       └────────────┴──────┬──────┴──────────────┘        │
│                           │                              │
│                    invoke() / listen()                   │
│                     Tauri IPC Bridge                     │
├───────────────────────────┼──────────────────────────────┤
│                           │                              │
│                   Commands / Events                      │
│                                                          │
│  ┌──────┐                                                │
│  │ Jax  │─── 持有所有 Shard，提供 get_shard<T>()            │
│  └──┬───┘                                                │
│     │  register + setup                                  │
│     ▼                                                    │
│  ┌──────────┬──────────┬──────────┬─────────┬─────────┐  │
│  │ LcuShard │ AutoSel  │ AutoGF   │  Tray   │  ...    │  │
│  │(已实现)   │ (stub)   │ (stub)   │ (stub)  │         │  │
│  └──────────┴──────────┴──────────┴─────────┴─────────┘  │
│                                                          │
│  ┌──────────┐                                            │
│  │ SqliteDb │  WAL 模式，线程安全                           │
│  └──────────┘                                            │
│                     Backend (Rust)                       │
└──────────────────────────────────────────────────────────┘
```

## Shard 插件体系

所有功能以 Shard 为单元组织。每个 Shard 实现 `Shard` trait，提供 `id()`、`label()`、`setup()`。

```
                        ┌────────────┐
                        │    Jax     │
                        │ (核心上下文)│
                        └─────┬──────┘
                              │ register → Arc::new → start
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌───────────┐  ┌───────────┐   ┌───────────┐
        │ LcuShard  │  │ TrayShard │   │ KeyBoard  │
        │           │  │           │   │  Shard    │
        └─────┬─────┘  └───────────┘   └───────────┘
              │
              │ get_shard<LcuShard>()
              ▼
        ┌───────────┐
        │ AutoSel   │  Shard 间通过 Jax 互相访问
        │  Shard    │  或通过 broadcast channel 订阅事件
        └───────────┘
```

### 已注册的 Shard

| Shard             | 状态   | 用途                     |
|-------------------|------|------------------------|
| **LcuShard**      | 已实现  | LCU 多实例管理、WebSocket 事件 |
| AutoSelectShard   | stub | 自动选人                   |
| AutoGameflowShard | stub | 自动游戏流程                 |
| AutoReplyShard    | stub | 自动回复                   |
| OngoingGameShard  | stub | 当前对局信息                 |
| SavedPlayerShard  | stub | 标记玩家                   |
| StatisticsShard   | stub | 统计数据                   |
| KeyboardShard     | stub | 全局快捷键                  |
| TrayShard         | stub | 系统托盘                   |
| UpdaterShard      | stub | 自动更新                   |

## 前后端通信

```
  Frontend                              Backend
  ────────                              ───────

  invoke("cmd", args)  ─── RPC ──────►  #[tauri::command]
                                        fn cmd(jax: State<Jax>)

  listen("event", cb)  ◄── Event ────  app.emit("event", payload)
```

- **Commands (前端→后端)**：同步 RPC 调用，支持参数和返回值
- **Events (后端→前端)**：广播推送，一对多，无应答

## LCU Shard 架构（已实现）

LCU Shard 支持同时管理多个 League Client 进程，通过焦点切换选择活跃实例。

### 三层结构

```
┌─────────────────────────────────────────────────────┐
│                    LcuShard                         │
│  对外接口：subscribe() / client() / switch_focus()  │
│                                                     │
│  broadcast::Sender ◄──── 其他 Shard 订阅            │
│  Arc<RwLock<Option<LcuClient>>> ◄── 共享聚焦客户端   │
│  mpsc::Sender ────────────────────────┐             │
└───────────────────────────────────────┼─────────────┘
                                        │
                  setup() spawns        ▼
┌─────────────────────────────────────────────────────┐
│                   LcuManager                        │
│                                                     │
│  每 2s 轮询        instances: HashMap<PID, Instance>│
│       │                                             │
│       ▼            focus_pid: Option<u32>            │
│  ┌──────────┐                                       │
│  │Connector │      ┌─────────┐  ┌─────────┐        │
│  │detect_all│      │ Inst #1 │  │ Inst #2 │  ...   │
│  │(平台相关)│      │ PID=123 │  │ PID=456 │        │
│  └──────────┘      └────┬────┘  └────┬────┘        │
│                         │            │              │
│                    状态机反馈 (mpsc channel)          │
└─────────────────────────────────────────────────────┘
```

### 实例状态机

每个 `LcuInstance` 内嵌一个 statig 状态机：

```
                    ┌────────────────┐
                    │ Authenticating │ ◄─── 初始状态
                    │                │
                    │ 每秒尝试 HTTPS │
                    │ 验证 auth 有效  │
                    └───────┬────────┘
                            │ AuthOk
                            ▼
                    ┌────────────────┐
                    │     Ready      │
                    │                │
                    │ 持有 LcuClient │
                    │ WebSocket 监听 │
                    └───────┬────────┘
                            │ ProcessLost / WsDisconnected
                            ▼
                    ┌────────────────┐
                    │    Closing     │
                    │                │
                    │ 中止所有任务    │
                    │ 等待被 Manager  │
                    │ 清理移除        │
                    └────────────────┘
```

### 焦点管理策略

```
新实例 Ready?  ──── 当前有焦点? ──── 是 → 不切换（不打扰）
                        │
                        否 → 自动聚焦该实例

焦点实例消失?  ──── 还有其他 Ready 实例? ──── 是 → 自动选第一个
                        │
                        否 → focus_pid = None，广播 Disconnected
```

### Connector（平台适配）

```
              LcuConnector trait
              ┌──────────────────┐
              │ detect_all()     │
              │ → Vec<LcuAuth>   │
              └────────┬─────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
 #[cfg(windows)]            #[cfg(macos)]
 WindowsLcuConnector        (未实现)

 读取 LeagueClientUx        未来：读取进程
 进程命令行参数               或 lockfile
 --app-port
 --remoting-auth-token
```

### LCU 数据流

```
  Connector                Manager              Frontend
  ─────────                ───────              ────────

  detect_all()
  → Vec<LcuAuth>  ──────►  新 PID?
                            创建 Instance
                            Instance 启动认证

                            Instance 反馈
                            AuthOk ──────────►  emit("lcu-instances-changed")
                                                → 更新 Zustand store

                            WsMessage ───────►  emit("lcu-event")
                                                → React Query 刷新

  invoke("lcu_switch_focus", pid)  ◄──────────  用户点击切换
                            更新 focus_pid
                            更新 shared_client
                            广播 Connected ──►  emit("lcu-instances-changed")
```

## 前端结构

```
  src/
  ├── routes/           TanStack Router 页面（自动发现）
  ├── features/         功能模块，每个模块可注册 WebShard
  │   ├── history/      战绩查询（已实现）
  │   ├── registry.ts   WebShard 注册表 → 动态导航菜单
  │   └── shard-ids.ts  与 Rust 端 UUID 对应
  ├── stores/           Zustand 状态（lcu / app / theme）
  ├── hooks/            自定义 Hook（事件监听、主题）
  ├── styles/           Vanilla Extract 主题 + 全局样式
  └── components/       通用 UI 组件
```

### 样式体系

- 引擎：Vanilla Extract（零运行时 CSS-in-TS）
- 色彩：全部使用 `oklch()` 语法
- 布局：页面级 CSS Grid，组件内微调可用 Flex
- 变体：`recipe()` + `styleVariants()`
- 主题：`createGlobalThemeContract` 定义 token，暗色/亮色两套

### 数据获取

```
  用户操作
     │
     ▼
  TanStack Query (useQuery)
     │
     ▼
  invoke("command")  ───►  Rust Command
     │                         │
     ▼                         ▼
  缓存 + 自动刷新           LcuClient.get/post(LCU API)
```

## 数据库

SQLite WAL 模式，存储路径 `{APP_DATA}/league-jax.db`。

| 表 | 用途 |
|----|------|
| saved_players | 标记的玩家（puuid, note, tag） |
| encountered_games | 遇到的对局记录 |
| search_history | 搜索历史（puuid, 名字, 标签） |
