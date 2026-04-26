import type { Resource } from "i18next";

export const settingsAboutI18n: Resource = {
  en: {
    settings: {
      pages: {
        about: {
          title: "About",
        },
      },
      about: {
        overview: {
          title: "League Jax",
          version: "v{{version}}",
          description:
            "<brand>League Jax</brand> <version>v{{version}}</version> is a desktop companion for League of Legends players, designed to make the overall experience clearer and smoother.",
          referencePrefix: "This project references",
          referenceSuffix: "'s user experience",
        },
        openSource: {
          title: "Open Source Dependencies",
          summary:
            "<brand>League Jax</brand> is built on a focused set of open source dependencies spanning the desktop shell, UI runtime, routing, styling, state flow, and internal foundations.",
          roles: {
            arkUi: "Accessible UI primitives",
            jax: "Dependency-aware shard runtime and lifecycle orchestration used as the app's modular foundation.",
            lucide: "Application icon set",
            maokai:
              "Runtime state machine and behavior-tree framework used to model app workflows and state transitions.",
            react: "User interface runtime",
            reactRouter: "App routing",
            sled: "Embedded ordered key-value database used on the Rust side for local persistence.",
            snafu:
              "Rust error handling library used to build structured, context-rich application errors.",
            swr: "Remote data fetching and cache",
            tauri: "Desktop shell and native bridge",
            thaterror:
              "Schema-first, type-safe error toolkit used to keep frontend error modeling and diagnostics consistent.",
            typescript: "Type-safe frontend development",
            vanillaExtract: "Type-safe styling system",
            vite: "Frontend dev server and bundler",
            zod: "Schema validation",
            zustand:
              "Lightweight state management for frontend stores and reactive app state.",
          },
        },
      },
    },
  },
  "zh-CN": {
    settings: {
      pages: {
        about: {
          title: "关于",
        },
      },
      about: {
        overview: {
          title: "League Jax",
          version: "v{{version}}",
          description:
            "<brand>League Jax</brand><version>v{{version}}</version> 是一个面向《英雄联盟》玩家的桌面辅助工具，旨在让整体游戏体验更清晰、更顺手。",
          referencePrefix: "本项目参考了",
          referenceSuffix: "的使用体验",
        },
        openSource: {
          title: "使用的开源依赖",
          summary:
            "<brand>League Jax</brand> 建立在一组聚焦的开源依赖之上，它们共同承担桌面运行时、界面渲染、路由、样式系统、状态流与内部基础能力。",
          roles: {
            arkUi: "无障碍交互组件基础",
            jax: "负责依赖感知的 shard 运行时与生命周期编排，是整个应用模块化架构的基础。",
            lucide: "应用图标集",
            maokai:
              "负责运行时状态机与行为树能力，用来承载应用内部的工作流和状态切换模型。",
            react: "界面渲染运行时",
            reactRouter: "应用路由",
            sled: "负责 Rust 侧本地持久化能力，是一个嵌入式有序键值数据库。",
            snafu:
              "负责 Rust 侧结构化错误处理，用来构建带上下文信息的应用错误类型。",
            swr: "远程数据获取与缓存",
            tauri: "桌面外壳与原生桥接",
            thaterror:
              "提供 schema-first 的类型安全错误工具，用来统一前端错误建模、诊断与扩展方式。",
            typescript: "类型安全的前端开发",
            vanillaExtract: "类型安全样式系统",
            vite: "前端开发服务器与构建工具",
            zod: "数据结构校验",
            zustand: "用于前端 store 与响应式应用状态管理的轻量状态库。",
          },
        },
      },
    },
  },
  "ja-JP": {
    settings: {
      pages: {
        about: {
          title: "概要",
        },
      },
      about: {
        overview: {
          title: "League Jax",
          version: "v{{version}}",
          description:
            "<brand>League Jax</brand><version>v{{version}}</version> は『League of Legends』プレイヤー向けのデスクトップ補助ツールで、全体のゲーム体験をより分かりやすく快適にすることを目指しています。",
          referencePrefix: "本プロジェクトは",
          referenceSuffix: "の使用感を参考にしています",
        },
        openSource: {
          title: "使用しているオープンソース依存関係",
          summary:
            "<brand>League Jax</brand> は、デスクトップランタイム、UI 描画、ルーティング、スタイリング、状態管理、内部基盤を支える厳選したオープンソース依存関係の上に成り立っています。",
          roles: {
            arkUi: "アクセシブルな UI プリミティブ",
            jax: "依存関係を認識する shard ランタイムとライフサイクル制御を担い、アプリのモジュール基盤を支えます。",
            lucide: "アプリケーションのアイコンセット",
            maokai:
              "実行時の状態機械とビヘイビアツリーを担い、アプリ内部のワークフローと状態遷移を表現します。",
            react: "UI レンダリングランタイム",
            reactRouter: "アプリケーションルーティング",
            sled: "Rust 側のローカル永続化を支える、組み込み型の順序付きキー値データベースです。",
            snafu:
              "Rust 側の構造化エラー処理を担い、コンテキスト付きアプリケーションエラーを構築します。",
            swr: "リモートデータ取得とキャッシュ",
            tauri: "デスクトップシェルとネイティブブリッジ",
            thaterror:
              "schema-first な型安全エラーツールキットで、フロントエンドのエラーモデリングと診断を統一します。",
            typescript: "型安全なフロントエンド開発",
            vanillaExtract: "型安全なスタイリングシステム",
            vite: "フロントエンド開発サーバーとビルドツール",
            zod: "スキーマ検証",
            zustand:
              "フロントエンドの store とリアクティブなアプリ状態管理のための軽量ステートライブラリ。",
          },
        },
      },
    },
  },
};
