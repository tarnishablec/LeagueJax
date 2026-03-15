# LeagueJax Architecture

Tauri v2 桌面应用，前端 React + TypeScript，后端 Rust + Tokio。前后端通过 Tauri IPC（invoke / emit）通信。

## 总体结构

```
Frontend (WebView)
  ├─ Routes / Features / Stores
  └─ invoke("command") / listen("event")
           │
           ▼
Tauri IPC Bridge
           │
           ▼
Backend (Rust)
  ├─ Jax Shards（模块化功能单元）
  └─ LCU Shard（多实例管理 + 事件转发）
```

## Shard 架构

所有功能以 Shard 组织。每个 Shard 实现 `Shard` trait，注册到 Jax，上层可通过 `get_shard<T>()` 访问。

当前 LCU Shard 的对外暴露是 **LcuManager**，Shard 本身不再透传 tx/rx：

```
Jax
 └─ LcuShard
     └─ LcuManager (Arc)
```

## LCU Shard（核心）

LCU Shard 支持同时管理多个 League Client 进程，通过聚焦机制选择当前实例。

### 主要组件

- **LcuConnector**：平台适配层，负责发现本机 LCU 进程并解析认证信息。
- **LcuManager**：全局管理器，轮询进程，维护实例列表与聚焦状态，向前端广播快照与事件。
- **LcuInstance**：单个 LCU 实例容器，持有 auth、install_dir、API client 和状态机。
- **LcuInstanceBridge**：实例内部 actor，持有状态机与 watcher/auth 任务，驱动生命周期。
- **LcuWatcher**：纯数据源，只负责 WebSocket -> `LcuEvent` 的 stream。
- **LcuApi**：LCU REST API 请求端（原 LcuClient，已迁移到 `api.rs`）。

### 数据流

```
Connector.detect_all()
  └─ LcuManager 创建/维护 LcuInstance
        └─ LcuInstanceBridge 运行状态机
              ├─ auth loop -> AuthOk/AuthFailed
              ├─ watcher stream -> LcuEvent
              └─ 生命周期信号 -> LcuManager

LcuManager:
  ├─ 维护 instances + focus_pid
  ├─ 生成 LcuInstanceInfo 快照
  └─ emit:
      - "lcu-instances-changed"
      - "lcu-event" (仅聚焦实例)
      - "lcu-focus-changed"
```

### 聚焦语义（update_focus）

`update_focus(pid: Option<u32>)` 的语义如下：

- `None`：强制清空 focus，不自动聚焦。
- `Some(0)`：自动选择  
  - 若 ready 实例恰好 1 个 → 选中  
  - 否则 → 不选
- `Some(pid>0)`：只有该实例 ready 时才聚焦，否则清空。

**自动聚焦只在 focus 丢失/失效时显式触发**，不在周期性 tick 中隐式进行。

### 状态机

每个实例内部状态机（statig）是**单一真相**，运行于 `LcuInstanceBridge`：

```
Authenticating
  └─ AuthOk -> Ready
Ready
  └─ WsDisconnected / ProcessLost -> Closing
Closing
  └─ 等待 manager 清理移除
```

`LcuInstance` 通过持有状态机引用提供 `status()`，用于生成 `LcuInstanceInfo`。

## IPC：Command / Event

### Commands（前端 -> 后端）

```
invoke("lcu_update_focus", { pid })
```

### Events（后端 -> 前端）

- `lcu-instances-changed`：实例快照列表
- `lcu-event`：聚焦实例的 WebSocket 事件
- `lcu-focus-changed`：focus 变化（previous/requested/current）

## 前端结构

```
src/
  routes/       路由页面（TanStack Router）
  features/     功能模块
  stores/       Zustand 状态管理
  hooks/        事件与数据访问
  styles/       Vanilla Extract 主题
  components/   通用 UI 组件
```

前端类型全部来自 Rust `ts-rs` 导出（`src/bindings/`），禁止手写重复类型。

## 数据存储

当前数据存储统一使用 `PersistentSled`（sled），实现位于 `persistence_sled` shard（`src-tauri/src/shards/persistence_sled.rs`），不再使用 SQLite。
