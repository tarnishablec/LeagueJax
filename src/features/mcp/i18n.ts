import type { LocaleResource } from "@/i18n/types";

export const mcpI18n: LocaleResource = {
  en: {
    settings: {
      pages: {
        mcp: {
          title: "MCP",
        },
      },
      sections: {
        mcp: {
          server: {
            title: "Server",
          },
        },
      },
      mcp: {
        port: {
          label: "MCP Port",
          hint: "Local port for the Streamable HTTP MCP server. Changes apply the next time the server starts.",
        },
        toggle: {
          label: "MCP Server",
          start: "Start MCP Server",
          stop: "Stop MCP Server",
          hint: "Starts or stops the local MCP server at 127.0.0.1 with the configured port. First version exposes read-only tools and has no token yet.",
        },
        status: {
          label: "Endpoint",
        },
      },
    },
    mcp: {
      toolbar: {
        running: "MCP server running: {{endpoint}}",
      },
      tools: {
        status: {
          running: "Server running",
          stopped: "Server stopped",
        },
        action: {
          start: "Start",
          stop: "Stop",
          starting: "Starting",
          stopping: "Stopping",
        },
        endpoint: {
          label: "Endpoint",
          port: "Port",
          portInvalid: "Port must be an integer between 1 and 65535",
        },
        calls: {
          title: "Call records",
          clear: "Clear",
          empty: "No MCP calls recorded",
          titleLine: "{{clientName}} called {{toolName}}",
          calledAt: "{{time}}",
          clientVersion: "Version {{version}}",
          session: "Session {{sessionId}}",
          noSession: "No session",
          protocol: "{{protocol}} · {{transport}}",
        },
        tools: {
          title: "Tools",
          empty: "No MCP tools registered",
          noDescription: "No description",
          readOnly: "Read-only",
          writable: "Writable",
          destructive: "Destructive",
          nonDestructive: "Non-destructive",
          idempotent: "Idempotent",
          nonIdempotent: "Non-idempotent",
          openWorld: "External context",
          closedWorld: "Local context",
        },
      },
    },
  },
  "zh-CN": {
    settings: {
      pages: {
        mcp: {
          title: "MCP",
        },
      },
      sections: {
        mcp: {
          server: {
            title: "服务",
          },
        },
      },
      mcp: {
        port: {
          label: "MCP 端口",
          hint: "本地 Streamable HTTP MCP 服务使用的端口。修改后会在下次启动服务时生效。",
        },
        toggle: {
          label: "MCP 服务",
          start: "启动 MCP 服务",
          stop: "关闭 MCP 服务",
          hint: "使用配置的端口在 127.0.0.1 启动或关闭本地 MCP 服务。第一版只暴露只读工具，暂不加 token。",
        },
        status: {
          label: "服务地址",
        },
      },
    },
    mcp: {
      toolbar: {
        running: "MCP 服务运行中：{{endpoint}}",
      },
      tools: {
        status: {
          running: "服务运行中",
          stopped: "服务未启动",
        },
        action: {
          start: "启动",
          stop: "关闭",
          starting: "启动中",
          stopping: "关闭中",
        },
        endpoint: {
          label: "服务地址",
          port: "端口",
          portInvalid: "端口必须是 1 到 65535 之间的整数",
        },
        calls: {
          title: "调用记录",
          clear: "清空",
          empty: "暂无 MCP 调用记录",
          titleLine: "{{clientName}} 调用了 {{toolName}}",
          calledAt: "{{time}}",
          clientVersion: "版本 {{version}}",
          session: "会话 {{sessionId}}",
          noSession: "无会话",
          protocol: "{{protocol}} · {{transport}}",
        },
        tools: {
          title: "工具",
          empty: "暂无已注册 MCP 工具",
          noDescription: "暂无描述",
          readOnly: "只读",
          writable: "可写",
          destructive: "破坏性",
          nonDestructive: "非破坏性",
          idempotent: "幂等",
          nonIdempotent: "非幂等",
          openWorld: "外部上下文",
          closedWorld: "本地上下文",
        },
      },
    },
  },
  "ja-JP": {
    settings: {
      pages: {
        mcp: {
          title: "MCP",
        },
      },
      sections: {
        mcp: {
          server: {
            title: "サーバー",
          },
        },
      },
      mcp: {
        port: {
          label: "MCP ポート",
          hint: "ローカル Streamable HTTP MCP サーバーで使用するポートです。変更は次回起動時に反映されます。",
        },
        toggle: {
          label: "MCP サーバー",
          start: "MCP サーバーを起動",
          stop: "MCP サーバーを停止",
          hint: "設定したポートで 127.0.0.1 のローカル MCP サーバーを起動または停止します。初版は読み取り専用ツールのみで、token はまだありません。",
        },
        status: {
          label: "エンドポイント",
        },
      },
    },
    mcp: {
      toolbar: {
        running: "MCP サーバー実行中: {{endpoint}}",
      },
      tools: {
        status: {
          running: "サーバー実行中",
          stopped: "サーバー停止中",
        },
        action: {
          start: "起動",
          stop: "停止",
          starting: "起動中",
          stopping: "停止中",
        },
        endpoint: {
          label: "エンドポイント",
          port: "ポート",
          portInvalid: "ポートは 1 から 65535 までの整数である必要があります",
        },
        calls: {
          title: "呼び出し記録",
          clear: "クリア",
          empty: "MCP 呼び出し記録はありません",
          titleLine: "{{clientName}} が {{toolName}} を呼び出しました",
          calledAt: "{{time}}",
          clientVersion: "バージョン {{version}}",
          session: "セッション {{sessionId}}",
          noSession: "セッションなし",
          protocol: "{{protocol}} · {{transport}}",
        },
        tools: {
          title: "ツール",
          empty: "登録済み MCP ツールはありません",
          noDescription: "説明なし",
          readOnly: "読み取り専用",
          writable: "書き込み可能",
          destructive: "破壊的",
          nonDestructive: "非破壊的",
          idempotent: "冪等",
          nonIdempotent: "非冪等",
          openWorld: "外部コンテキスト",
          closedWorld: "ローカルコンテキスト",
        },
      },
    },
  },
};
