import type { Resource } from "i18next";

export const settingsI18n: Resource = {
  en: {
    nav: {
      settings: "Settings",
    },
    settings: {
      title: "Settings",
      pages: {
        system: {
          title: "System",
        },
      },
      sections: {
        system: {
          preferences: {
            title: "Preferences",
          },
          network: {
            title: "Network",
          },
          logging: {
            title: "Logging",
          },
        },
      },
      language: {
        label: "Language",
        hint: "Some text may follow the League client's language instead of this setting.",
        zhCN: "Simplified Chinese",
        en: "English",
        jaJP: "Japanese",
      },
      theme: {
        label: "Theme",
        system: "System",
        light: "Light",
        dark: "Dark",
      },
      assetSource: {
        label: "Asset Source",
        cdragon: "CommunityDragon",
        ddragon: "Data Dragon",
      },
      network: {
        requestTimeoutSeconds: {
          label: "Request Timeout (seconds)",
        },
      },
      logging: {
        recordToFile: {
          label: "Record Logs To File",
          hint: "Write backend logs to local log files.",
        },
        retentionDays: {
          label: "Log Retention Days",
          hint: "Automatically remove log files older than this many days.",
        },
        openDir: {
          label: "Open Log Directory",
        },
        cleanLogs: {
          label: "Clear Logs Now",
        },
      },
      registry: {
        tab: "Registry",
        columns: {
          key: "Key",
          zh: "Chinese",
          en: "English",
          scope: "Scope",
        },
      },
      clientArgs: {
        tab: "Client Args",
        commandTitle: "Command Line",
        columns: {
          key: "Key",
          value: "Value",
        },
        empty: "No focused client.",
      },
      shards: {
        tab: "Shards",
        frontendTab: "TS",
        backendTab: "RS",
        viewTable: "Table",
        viewGraph: "Graph",
        columns: {
          name: "Name",
          id: "ID",
          status: "Status",
          dependencies: "Dependencies",
          duration: "Duration",
        },
        status: {
          running: "Running",
          failed: "Failed",
          skipped: "Skipped",
        },
        noDependencies: "None",
        noDuration: "-",
        copied: "Copied",
      },
    },
  },
  "zh-CN": {
    nav: {
      settings: "\u8bbe\u7f6e",
    },
    settings: {
      title: "\u8bbe\u7f6e",
      pages: {
        system: {
          title: "\u7cfb\u7edf",
        },
      },
      sections: {
        system: {
          preferences: {
            title: "\u504f\u597d",
          },
          network: {
            title: "网络",
          },
          logging: {
            title: "\u65e5\u5fd7",
          },
        },
      },
      language: {
        label: "\u8bed\u8a00",
        hint: "部分文本的语言取决于游戏客户端的语言设置，而非此选项。",
        zhCN: "\u7b80\u4f53\u4e2d\u6587",
        en: "English",
        jaJP: "Japanese",
      },
      theme: {
        label: "\u4e3b\u9898",
        system: "\u8ddf\u968f\u7cfb\u7edf",
        light: "\u6d45\u8272",
        dark: "\u6df1\u8272",
      },
      assetSource: {
        label: "\u8d44\u6e90\u6765\u6e90",
        cdragon: "CommunityDragon",
        ddragon: "Data Dragon",
      },
      network: {
        requestTimeoutSeconds: {
          label: "请求超时（秒）",
        },
      },
      logging: {
        recordToFile: {
          label: "记录日志到文件",
          hint: "将后端日志写入本地日志文件。",
        },
        retentionDays: {
          label: "日志保留天数",
          hint: "自动删除早于该天数的日志文件。",
        },
        openDir: {
          label: "打开日志目录",
        },
        cleanLogs: {
          label: "立即清理日志",
        },
      },
      registry: {
        tab: "\u6ce8\u518c\u8868",
        columns: {
          key: "\u952e",
          zh: "\u4e2d\u6587",
          en: "\u82f1\u6587",
          scope: "\u4f5c\u7528\u57df",
        },
      },
      clientArgs: {
        tab: "\u5ba2\u6237\u7aef\u53c2\u6570",
        commandTitle: "\u547d\u4ee4\u884c",
        columns: {
          key: "\u53c2\u6570",
          value: "\u503c",
        },
        empty:
          "\u5f53\u524d\u6ca1\u6709\u805a\u7126\u7684\u5ba2\u6237\u7aef\u3002",
      },
      shards: {
        tab: "\u63d2\u4ef6",
        frontendTab: "TS",
        backendTab: "RS",
        viewTable: "\u8868\u683c",
        viewGraph: "\u4f9d\u8d56\u56fe",
        columns: {
          name: "\u540d\u79f0",
          id: "ID",
          status: "\u72b6\u6001",
          dependencies: "\u4f9d\u8d56",
          duration: "\u542f\u52a8\u8017\u65f6",
        },
        status: {
          running: "\u8fd0\u884c\u4e2d",
          failed: "\u5931\u8d25",
          skipped: "\u5df2\u8df3\u8fc7",
        },
        noDependencies: "\u65e0",
        noDuration: "-",
        copied: "\u5df2\u590d\u5236",
      },
    },
  },
  "ja-JP": {
    nav: {
      settings: "\u8a2d\u5b9a",
    },
    settings: {
      title: "\u8a2d\u5b9a",
      pages: {
        system: {
          title: "\u30b7\u30b9\u30c6\u30e0",
        },
      },
      sections: {
        system: {
          preferences: {
            title: "\u74b0\u5883\u8a2d\u5b9a",
          },
          network: {
            title: "ネットワーク",
          },
          logging: {
            title: "\u30ed\u30b0",
          },
        },
      },
      language: {
        label: "\u8a00\u8a9e",
        hint: "一部のテキストはこの設定ではなく、ゲームクライアントの言語設定に従います。",
        zhCN: "\u7c21\u4f53\u5b57\u4e2d\u56fd\u8a9e",
        en: "\u82f1\u8a9e",
        jaJP: "\u65e5\u672c\u8a9e",
      },
      theme: {
        label: "\u30c6\u30fc\u30de",
        system: "\u30b7\u30b9\u30c6\u30e0",
        light: "\u30e9\u30a4\u30c8",
        dark: "\u30c0\u30fc\u30af",
      },
      assetSource: {
        label: "\u30a2\u30bb\u30c3\u30c8\u30bd\u30fc\u30b9",
        cdragon: "CommunityDragon",
        ddragon: "Data Dragon",
      },
      network: {
        requestTimeoutSeconds: {
          label: "リクエストタイムアウト（秒）",
        },
      },
      logging: {
        recordToFile: {
          label: "ログをファイルに記録",
          hint: "バックエンドログをローカルのログファイルに書き込みます。",
        },
        retentionDays: {
          label: "ログ保持日数",
          hint: "この日数より古いログファイルを自動削除します。",
        },
        openDir: {
          label: "ログディレクトリを開く",
        },
        cleanLogs: {
          label: "今すぐログを整理",
        },
      },
      registry: {
        tab: "\u30ec\u30b8\u30b9\u30c8\u30ea",
        columns: {
          key: "\u30ad\u30fc",
          zh: "\u4e2d\u56fd\u8a9e",
          en: "\u82f1\u8a9e",
          scope: "\u30b9\u30b3\u30fc\u30d7",
        },
      },
      clientArgs: {
        tab: "\u30af\u30e9\u30a4\u30a2\u30f3\u30c8\u5f15\u6570",
        commandTitle: "\u30b3\u30de\u30f3\u30c9\u30e9\u30a4\u30f3",
        columns: {
          key: "\u30ad\u30fc",
          value: "\u5024",
        },
        empty:
          "\u30d5\u30a9\u30fc\u30ab\u30b9\u4e2d\u306e\u30af\u30e9\u30a4\u30a2\u30f3\u30c8\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
      },
      shards: {
        tab: "\u30d7\u30e9\u30b0\u30a4\u30f3",
        frontendTab: "TS",
        backendTab: "RS",
        viewTable: "\u30c6\u30fc\u30d6\u30eb",
        viewGraph: "\u4f9d\u5b58\u30b0\u30e9\u30d5",
        columns: {
          name: "\u540d\u524d",
          id: "ID",
          status: "\u30b9\u30c6\u30fc\u30bf\u30b9",
          dependencies: "\u4f9d\u5b58\u95a2\u4fc2",
          duration: "\u8d77\u52d5\u6642\u9593",
        },
        status: {
          running: "\u5b9f\u884c\u4e2d",
          failed: "\u5931\u6557",
          skipped: "\u30b9\u30ad\u30c3\u30d7",
        },
        noDependencies: "\u306a\u3057",
        noDuration: "-",
        copied: "\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f",
      },
    },
  },
};
