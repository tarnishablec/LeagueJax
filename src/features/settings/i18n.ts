import type { Resource } from "i18next";

export const settingsI18n: Resource = {
  en: {
    nav: {
      settings: "Settings",
    },
    settings: {
      title: "Settings",
      contextMenu: {
        resetSetting: "Reset This Setting",
        resetSection: "Reset This Section",
        resetPage: "Reset This Page",
        resetAll: "Reset All Settings",
      },
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
          update: {
            title: "Update",
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
      colorPicker: {
        presets: "Presets",
      },
      network: {
        requestTimeoutSeconds: {
          label: "Request Timeout (seconds)",
        },
        useSystemProxy: {
          label: "Use System Proxy",
          hint: "Used for external API requests. Local LCU requests are not affected.\nWhen enabled, reads system http_proxy, https_proxy, and no_proxy environment variables; connects directly when they are not set.",
        },
      },
      logging: {
        recordToFile: {
          label: "Record Logs To File",
          hint: "Write backend logs to local log files.",
        },
        level: {
          label: "Log Level",
          hint: "Controls the minimum level written by backend logs.",
          options: {
            error: "Error",
            warn: "Warn",
            info: "Info",
            debug: "Debug",
            trace: "Trace",
          },
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
      update: {
        source: {
          label: "Update Source",
          hint: "Choose where update metadata and installers are resolved from.",
          options: {
            auto: "Auto",
            gitee: "Gitee",
            github: "GitHub",
          },
        },
        autoCheckOnStartup: {
          label: "Check Updates On Startup",
          hint: "Only checks for updates automatically. It will not download or install them.",
        },
        action: {
          label: "Update Action",
          hint: "The button checks for updates first, then turns into install when a new version is available.",
          check: "Check For Updates",
          install: "Install Update",
        },
        status: {
          idle: "Not Checked",
          checking: "Checking",
          upToDate: "Up To Date",
          updateAvailable: "Update Available",
          installing: "Installing",
          error: "Failed",
        },
        summary: {
          title: "Update Status",
          currentVersion: "Current Version",
          latestVersion: "Latest Version",
          source: "Selected Source",
          message: "Message",
          notes: "Release Notes",
          none: "None",
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
      settings: "设置",
    },
    settings: {
      title: "设置",
      contextMenu: {
        resetSetting: "重置此项",
        resetSection: "重置此分区",
        resetPage: "重置当前页面",
        resetAll: "重置所有设置",
      },
      pages: {
        system: {
          title: "系统",
        },
      },
      sections: {
        system: {
          preferences: {
            title: "偏好",
          },
          network: {
            title: "网络",
          },
          logging: {
            title: "日志",
          },
          update: {
            title: "更新",
          },
        },
      },
      language: {
        label: "语言",
        hint: "部分文本会跟随英雄联盟客户端语言，而不是这个设置。",
        zhCN: "简体中文",
        en: "English",
        jaJP: "Japanese",
      },
      theme: {
        label: "主题",
        system: "跟随系统",
        light: "浅色",
        dark: "深色",
      },
      colorPicker: {
        presets: "预设颜色",
      },
      network: {
        requestTimeoutSeconds: {
          label: "请求超时（秒）",
        },
        useSystemProxy: {
          label: "使用系统代理",
          hint: "用于外部接口请求，LCU 本地请求不受影响。\n开启后读取系统 http_proxy、https_proxy、no_proxy 环境变量；未设置时直连。",
        },
      },
      logging: {
        recordToFile: {
          label: "记录日志到文件",
          hint: "将后端日志写入本地日志文件。",
        },
        level: {
          label: "日志级别",
          hint: "控制后端日志输出的最低级别。",
          options: {
            error: "Error",
            warn: "Warn",
            info: "Info",
            debug: "Debug",
            trace: "Trace",
          },
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
      update: {
        source: {
          label: "更新源",
          hint: "选择更新元数据和安装包优先从哪里解析。",
          options: {
            auto: "自动",
            gitee: "Gitee",
            github: "GitHub",
          },
        },
        autoCheckOnStartup: {
          label: "启动时自动检测更新",
          hint: "只会自动检查更新，不会自动下载或安装。",
        },
        action: {
          label: "更新操作",
          hint: "按钮会先检查更新，检测到新版本后再切换为安装。",
          check: "检查更新",
          install: "立即更新",
        },
        status: {
          idle: "尚未检查",
          checking: "正在检查",
          upToDate: "当前已是最新版本",
          updateAvailable: "发现新版本",
          installing: "正在安装",
          error: "更新失败",
        },
        summary: {
          title: "更新状态",
          currentVersion: "当前版本",
          latestVersion: "最新版本",
          source: "已选更新源",
          message: "状态消息",
          notes: "更新说明",
          none: "无",
        },
      },
      registry: {
        tab: "注册表",
        columns: {
          key: "键",
          zh: "中文",
          en: "英文",
          scope: "作用域",
        },
      },
      clientArgs: {
        tab: "客户端参数",
        commandTitle: "命令行",
        columns: {
          key: "参数",
          value: "值",
        },
        empty: "当前没有聚焦的客户端。",
      },
      shards: {
        tab: "插件",
        frontendTab: "TS",
        backendTab: "RS",
        viewTable: "表格",
        viewGraph: "依赖图",
        columns: {
          name: "名称",
          id: "ID",
          status: "状态",
          dependencies: "依赖",
          duration: "启动耗时",
        },
        status: {
          running: "运行中",
          failed: "失败",
          skipped: "已跳过",
        },
        noDependencies: "无",
        noDuration: "-",
        copied: "已复制",
      },
    },
  },
  "ja-JP": {
    nav: {
      settings: "設定",
    },
    settings: {
      title: "設定",
      contextMenu: {
        resetSetting: "この設定をリセット",
        resetSection: "このセクションをリセット",
        resetPage: "このページをリセット",
        resetAll: "すべての設定をリセット",
      },
      pages: {
        system: {
          title: "システム",
        },
      },
      sections: {
        system: {
          preferences: {
            title: "環境設定",
          },
          network: {
            title: "ネットワーク",
          },
          logging: {
            title: "ログ",
          },
          update: {
            title: "更新",
          },
        },
      },
      language: {
        label: "言語",
        hint: "一部のテキストはこの設定ではなく、League クライアントの言語設定に従います。",
        zhCN: "簡体字中国語",
        en: "英語",
        jaJP: "日本語",
      },
      theme: {
        label: "テーマ",
        system: "システム",
        light: "ライト",
        dark: "ダーク",
      },
      colorPicker: {
        presets: "プリセット",
      },
      network: {
        requestTimeoutSeconds: {
          label: "リクエストタイムアウト（秒）",
        },
        useSystemProxy: {
          label: "システムプロキシを使用",
          hint: "外部 API リクエストに使用します。ローカル LCU リクエストには影響しません。\n有効にすると、システムの http_proxy、https_proxy、no_proxy 環境変数を読み取ります。未設定の場合は直接接続します。",
        },
      },
      logging: {
        recordToFile: {
          label: "ログをファイルに記録",
          hint: "バックエンドログをローカルのログファイルへ書き込みます。",
        },
        level: {
          label: "ログレベル",
          hint: "バックエンドログに出力する最小レベルを制御します。",
          options: {
            error: "Error",
            warn: "Warn",
            info: "Info",
            debug: "Debug",
            trace: "Trace",
          },
        },
        retentionDays: {
          label: "ログ保持日数",
          hint: "指定日数より古いログファイルを自動削除します。",
        },
        openDir: {
          label: "ログディレクトリを開く",
        },
        cleanLogs: {
          label: "今すぐログを整理",
        },
      },
      update: {
        source: {
          label: "更新ソース",
          hint: "更新メタデータとインストーラーをどこから解決するかを選択します。",
          options: {
            auto: "自動",
            gitee: "Gitee",
            github: "GitHub",
          },
        },
        autoCheckOnStartup: {
          label: "起動時に更新を確認",
          hint: "起動時に自動で更新確認のみ行います。自動インストールはしません。",
        },
        action: {
          label: "更新アクション",
          hint: "ボタンは最初に更新確認を行い、新しいバージョンが見つかるとインストールに切り替わります。",
          check: "更新を確認",
          install: "更新をインストール",
        },
        status: {
          idle: "未確認",
          checking: "確認中",
          upToDate: "最新です",
          updateAvailable: "更新があります",
          installing: "インストール中",
          error: "失敗",
        },
        summary: {
          title: "更新状態",
          currentVersion: "現在のバージョン",
          latestVersion: "最新バージョン",
          source: "選択中のソース",
          message: "メッセージ",
          notes: "リリースノート",
          none: "なし",
        },
      },
      registry: {
        tab: "レジストリ",
        columns: {
          key: "キー",
          zh: "中国語",
          en: "英語",
          scope: "スコープ",
        },
      },
      clientArgs: {
        tab: "クライアント引数",
        commandTitle: "コマンドライン",
        columns: {
          key: "キー",
          value: "値",
        },
        empty: "現在フォーカス中のクライアントがありません。",
      },
      shards: {
        tab: "プラグイン",
        frontendTab: "TS",
        backendTab: "RS",
        viewTable: "テーブル",
        viewGraph: "依存グラフ",
        columns: {
          name: "名前",
          id: "ID",
          status: "ステータス",
          dependencies: "依存関係",
          duration: "起動時間",
        },
        status: {
          running: "実行中",
          failed: "失敗",
          skipped: "スキップ",
        },
        noDependencies: "なし",
        noDuration: "-",
        copied: "コピーしました",
      },
    },
  },
};
/*
const settingsI18nMutable = settingsI18n as Record<string, any>;

settingsI18nMutable.en.settings.pages.mini = {
  title: "Mini",
};
settingsI18nMutable.en.settings.sections.mini = {
  preference: {
    title: "Preference",
  },
};
settingsI18nMutable.en.settings.mini = {
  pin: {
    label: "Pin Mini Window",
    hint: "Keep the mini window docked to the League client while the client is available.",
  },
};

settingsI18nMutable["zh-CN"].settings.pages.mini = {
  title: "小窗",
};
settingsI18nMutable["zh-CN"].settings.sections.mini = {
  preference: {
    title: "偏好",
  },
};
settingsI18nMutable["zh-CN"].settings.mini = {
  pin: {
    label: "钉住小窗",
    hint: "启用后，只要英雄联盟客户端可用，小窗就会持续吸附在客户端右侧。",
  },
};

settingsI18nMutable["ja-JP"].settings.pages.mini = {
  title: "ミニ",
};
settingsI18nMutable["ja-JP"].settings.sections.mini = {
  preference: {
    title: "設定",
  },
};
settingsI18nMutable["ja-JP"].settings.mini = {
  pin: {
    label: "ミニウィンドウを固定",
    hint: "有効にすると、League クライアントが利用できる間はミニウィンドウを右側に吸着し続けます。",
  },
};
*/
