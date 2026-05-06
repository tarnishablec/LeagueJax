import type { Resource } from "i18next";

export const replayI18n: Resource = {
  en: {
    nav: {
      replay: "Replays",
    },
    replay: {
      title: "Replay Library",
      subtitle: "Manage local ROFL files and match-history downloads.",
      scan: "Scan",
      addFolder: "Add Folder",
      folderDropzone: "Choose or drop a replay folder",
      directoryPathUnavailable:
        "Could not read the selected folder path from the WebView file picker.",
      search: "Search replays",
      folders: "Folders",
      folderSource: {
        user: "User",
        client: "Client",
        default: "Default",
      },
      executables: "Detected Clients",
      replays: "Replays",
      empty: "No replay files found",
      noExecutables: "No running League client detected",
      loadingFolders: "Loading folders",
      loadingExecutables: "Detecting clients",
      loadingReplays: "Scanning replays",
      unknownVersion: "Unknown version",
      metadataFailed: "Parse failed",
      missing: "Missing",
      enabled: "Enabled",
      disabled: "Disabled",
      play: "Play",
      remove: "Remove",
      gameId: "Game ID",
      platform: "Platform",
      patch: "Patch",
      size: "Size",
      modified: "Modified",
      operationFailed: "Operation failed: {{reason}}",
      playTooltip: {
        unavailable: "Replay unavailable",
        matched: "{{family}} {{server}} {{version}}",
        localExecutable: "Local Tencent install {{version}}",
        reason: {
          missingGameId: "Replay file name does not include a game ID",
          noRunningClient: "No running League client detected",
          noRunningClientOrTencentInstall:
            "No running League client or compatible local Tencent install detected",
          riotLocalFallbackMissingClient:
            "No running Riot client detected; Riot replays cannot use local executable fallback",
          missingPlatformId: "Replay file name does not include a server",
          unknownFamily: "Replay server type could not be identified",
          missingVersion: "Replay version could not be parsed",
          missingFamilyClient: "No running {{family}} client detected",
          compatibleVersionMismatch:
            "No running {{family}} client has a compatible version for replay version {{version}}",
          riotLocalFallbackUnsupported:
            "No running Riot client matches replay version {{version}}; Riot replays cannot use local executable fallback",
          tencentClientOrInstallVersionMismatch:
            "No running Tencent client or local install matches replay version {{version}}",
          missingServerClient:
            "No running {{family}} client matches {{server}}",
          versionMismatch:
            "No running {{family}} client for {{server}} matches replay version {{version}}",
        },
      },
      matchReplay: {
        checking: "Checking",
        download: "Download replay",
        downloading: "Downloading {{progress}}",
        watch: "Watch replay",
        incompatible: "Replay unavailable",
        failed: "Replay failed",
      },
    },
  },
  "zh-CN": {
    nav: {
      replay: "回放",
    },
    replay: {
      title: "回放库",
      subtitle: "管理本地 ROFL 文件和战绩下载回放。",
      scan: "扫描",
      addFolder: "添加文件夹",
      folderDropzone: "选择或拖入回放文件夹",
      directoryPathUnavailable: "无法从 WebView 文件选择器读取所选文件夹路径。",
      search: "搜索回放",
      folders: "文件夹",
      folderSource: {
        user: "用户",
        client: "客户端",
        default: "默认",
      },
      executables: "检测到的客户端",
      replays: "回放",
      empty: "没有找到回放文件",
      noExecutables: "没有检测到正在运行的 League 客户端",
      loadingFolders: "正在加载文件夹",
      loadingExecutables: "正在检测客户端",
      loadingReplays: "正在扫描回放",
      unknownVersion: "未知版本",
      metadataFailed: "解析失败",
      missing: "缺失",
      enabled: "可用",
      disabled: "不可用",
      play: "播放",
      remove: "移除",
      gameId: "对局 ID",
      platform: "大区",
      patch: "版本",
      size: "大小",
      modified: "修改时间",
      operationFailed: "操作失败：{{reason}}",
      playTooltip: {
        unavailable: "回放不可用",
        matched: "{{family}} {{server}} {{version}}",
        localExecutable: "本地腾讯客户端 {{version}}",
        reason: {
          missingGameId: "回放文件名缺少对局 ID",
          noRunningClient: "没有检测到正在运行的 League 客户端",
          noRunningClientOrTencentInstall:
            "没有检测到正在运行的 League 客户端或兼容的本地腾讯客户端",
          riotLocalFallbackMissingClient:
            "没有检测到正在运行的 Riot 客户端；Riot 回放不能使用本地客户端兜底启动",
          missingPlatformId: "回放文件名缺少大区",
          unknownFamily: "无法识别回放所属客户端类型",
          missingVersion: "无法解析回放版本",
          missingFamilyClient: "没有检测到正在运行的 {{family}} 客户端",
          compatibleVersionMismatch:
            "没有正在运行的 {{family}} 客户端兼容回放版本 {{version}}",
          riotLocalFallbackUnsupported:
            "没有正在运行的 Riot 客户端匹配回放版本 {{version}}；Riot 回放不能使用本地客户端兜底启动",
          tencentClientOrInstallVersionMismatch:
            "没有正在运行的腾讯客户端或本地安装匹配回放版本 {{version}}",
          missingServerClient: "没有正在运行的 {{family}} {{server}} 客户端",
          versionMismatch:
            "正在运行的 {{family}} {{server}} 客户端版本与回放版本 {{version}} 不匹配",
        },
      },
      matchReplay: {
        checking: "检查中",
        download: "下载回放",
        downloading: "下载中 {{progress}}",
        watch: "观看回放",
        incompatible: "回放不可用",
        failed: "回放失败",
      },
    },
  },
  "ja-JP": {
    nav: {
      replay: "リプレイ",
    },
    replay: {
      title: "リプレイライブラリ",
      subtitle: "ローカル ROFL ファイルと戦績からのリプレイを管理します。",
      scan: "スキャン",
      addFolder: "フォルダーを追加",
      folderDropzone: "リプレイフォルダーを選択またはドロップ",
      directoryPathUnavailable:
        "WebView のファイルピッカーから選択したフォルダーのパスを読み取れませんでした。",
      search: "リプレイを検索",
      folders: "フォルダー",
      folderSource: {
        user: "ユーザー",
        client: "クライアント",
        default: "既定",
      },
      executables: "検出されたクライアント",
      replays: "リプレイ",
      empty: "リプレイファイルが見つかりません",
      noExecutables: "実行中の League クライアントが検出されません",
      loadingFolders: "フォルダーを読み込み中",
      loadingExecutables: "クライアントを検出中",
      loadingReplays: "リプレイをスキャン中",
      unknownVersion: "不明なバージョン",
      metadataFailed: "解析失敗",
      missing: "見つかりません",
      enabled: "有効",
      disabled: "無効",
      play: "再生",
      remove: "削除",
      gameId: "ゲーム ID",
      platform: "プラットフォーム",
      patch: "パッチ",
      size: "サイズ",
      modified: "更新日時",
      operationFailed: "操作に失敗しました: {{reason}}",
      playTooltip: {
        unavailable: "リプレイは利用できません",
        matched: "{{family}} {{server}} {{version}}",
        localExecutable: "ローカル Tencent クライアント {{version}}",
        reason: {
          missingGameId: "リプレイファイル名にゲーム ID がありません",
          noRunningClient: "実行中の League クライアントが検出されません",
          noRunningClientOrTencentInstall:
            "実行中の League クライアントまたは互換性のあるローカル Tencent クライアントが検出されません",
          riotLocalFallbackMissingClient:
            "実行中の Riot クライアントが検出されません。Riot リプレイはローカルクライアントでの代替起動に対応していません",
          missingPlatformId: "リプレイファイル名にサーバーがありません",
          unknownFamily: "リプレイのクライアント種別を識別できません",
          missingVersion: "リプレイのバージョンを解析できません",
          missingFamilyClient:
            "実行中の {{family}} クライアントが検出されません",
          compatibleVersionMismatch:
            "実行中の {{family}} クライアントにリプレイバージョン {{version}} と互換性のあるものがありません",
          riotLocalFallbackUnsupported:
            "リプレイバージョン {{version}} に一致する実行中の Riot クライアントがありません。Riot リプレイはローカルクライアントでの代替起動に対応していません",
          tencentClientOrInstallVersionMismatch:
            "実行中の Tencent クライアントまたはローカルインストールがリプレイバージョン {{version}} と一致しません",
          missingServerClient:
            "実行中の {{family}} {{server}} クライアントがありません",
          versionMismatch:
            "実行中の {{family}} {{server}} クライアントはリプレイバージョン {{version}} と一致しません",
        },
      },
      matchReplay: {
        checking: "確認中",
        download: "リプレイをダウンロード",
        downloading: "ダウンロード中 {{progress}}",
        watch: "リプレイを見る",
        incompatible: "リプレイは利用できません",
        failed: "リプレイに失敗しました",
      },
    },
  },
};
