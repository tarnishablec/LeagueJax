import type { Resource } from "i18next";

export const updaterI18n: Resource = {
  en: {
    settings: {
      sections: {
        system: {
          update: {
            title: "Update",
          },
        },
      },
      update: {
        source: {
          label: "Update Source",
          hint: "Choose where update metadata and installers are resolved from. GitHub uses this repository; Gitee uses the existing release mirror.",
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
          upToDate: "Up To Date",
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
        toast: {
          title: "Update Available",
          description:
            "Current version: {{currentVersion}}\nLatest version: {{latestVersion}}",
          action: "Open Update Settings",
        },
      },
    },
  },
  "zh-CN": {
    settings: {
      sections: {
        system: {
          update: {
            title: "更新",
          },
        },
      },
      update: {
        source: {
          label: "更新源",
          hint: "选择更新元数据和安装包的解析来源。GitHub 使用当前仓库，Gitee 使用现有发布镜像。",
          options: {
            auto: "自动",
            gitee: "Gitee",
            github: "GitHub",
          },
        },
        autoCheckOnStartup: {
          label: "启动时自动检查更新",
          hint: "只会自动检查更新，不会自动下载或安装。",
        },
        action: {
          label: "更新操作",
          hint: "按钮会先检查更新，检测到新版本后再切换为安装。",
          check: "检查更新",
          install: "立即更新",
          upToDate: "已是最新",
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
        toast: {
          title: "发现新版本 {{latestVersion}}",
          description:
            "当前版本：{{currentVersion}}\n最新版本：{{latestVersion}}",
          action: "打开更新设置",
        },
      },
    },
  },
  "ja-JP": {
    settings: {
      sections: {
        system: {
          update: {
            title: "更新",
          },
        },
      },
      update: {
        source: {
          label: "更新ソース",
          hint: "更新メタデータとインストーラーの取得元を選択します。GitHub は現在のリポジトリ、Gitee は既存のリリースミラーを使用します。",
          options: {
            auto: "自動",
            gitee: "Gitee",
            github: "GitHub",
          },
        },
        autoCheckOnStartup: {
          label: "起動時に更新を確認",
          hint: "起動時に更新確認のみ行います。自動ダウンロードや自動インストールは行いません。",
        },
        action: {
          label: "更新操作",
          hint: "ボタンは最初に更新を確認し、新しいバージョンが見つかるとインストールに切り替わります。",
          check: "更新を確認",
          install: "更新をインストール",
          upToDate: "最新です",
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
        toast: {
          title: "新しいバージョン {{latestVersion}} があります",
          description:
            "現在のバージョン: {{currentVersion}}\n最新バージョン: {{latestVersion}}",
          action: "更新設定を開く",
        },
      },
    },
  },
};
