const currentVersion = "0.1.71";
const currentTag = `v${currentVersion}`;
const currentExeName = `LeagueJax_${currentVersion}_x64-setup.exe`;

const releaseSources = {
  github: {
    api: "https://api.github.com/repos/tarnishablec/LeagueJax/releases/latest",
    releaseBase: "https://github.com/tarnishablec/LeagueJax/releases/download",
    latestBase:
      "https://github.com/tarnishablec/LeagueJax/releases/latest/download",
    fallback: `https://github.com/tarnishablec/LeagueJax/releases/latest/download/${currentExeName}`,
  },
  gitee: {
    api: "https://gitee.com/api/v5/repos/tarnishablec/league-jax-releases/releases/latest",
    releaseBase:
      "https://gitee.com/tarnishablec/league-jax-releases/releases/download",
    fallback: `https://gitee.com/tarnishablec/league-jax-releases/releases/download/${currentTag}/${currentExeName}`,
  },
};

const translations = {
  en: {
    navDownloads: "Downloads",
    navFeatures: "Features",
    navOpenSource: "Open Source",
    heroTitle: "LeagueJax",
    heroCopy:
      "A desktop companion for League of Legends players, built around match context, player lookup, replays, and lightweight update-aware tools.",
    githubDownload: "Download from GitHub",
    giteeDownload: "Download from Gitee",
    downloadNote:
      "Windows x64 installer. Direct links resolve to the latest release when release metadata is available.",
    previewPhase: "Live session",
    previewTitle: "Champion select context",
    previewHistory: "Recent history",
    previewHistoryCaption: "last 20 matches",
    previewUpdater: "Update source",
    previewUpdaterCaption: "direct installer links",
    featuresTitle: "Built for the moments around a match",
    featuresCopy:
      "LeagueJax focuses on the repeated desktop tasks before, during, and after a League of Legends session.",
    featureMatchTitle: "Match context",
    featureMatchCopy:
      "Keep the current phase, team context, and session state easy to scan without repeatedly switching windows.",
    featureHistoryTitle: "History and lookup",
    featureHistoryCopy:
      "Review recent matches and inspect player information for review and organization, not automated decision-making.",
    featureOverlayTitle: "Compact overlay",
    featureOverlayCopy:
      "Keep useful information visible in a lighter form designed to be readable and low-interruption.",
    featureReplayTitle: "Replays and tools",
    featureReplayCopy:
      "Centralize replay management and practical client-side companion actions as the project evolves.",
    openSourceTitle: "Partially open source by design",
    openSourceCopy:
      "LeagueJax keeps its public shell, interface, foundation, and public project materials available while leaving some core implementation outside the public repository to reduce low-effort repackaging.",
    licenseLabel: "License",
    licenseCopy:
      "Public source files and assets are governed by the repository license. Non-public components are not included in the public repository.",
    originTitle: "Why it exists",
    originCopy:
      "LeagueJax is connected to League Akari's partial open-source direction. It is an independent project for learning and practicing Tauri desktop development while building a tool shaped around my own workflow.",
    disclaimer:
      "LeagueJax is unofficial and is not affiliated with, sponsored by, or endorsed by Riot Games, Tencent Games, or League of Legends.",
    sourceLink: "Source on GitHub",
  },
  zh: {
    navDownloads: "下载",
    navFeatures: "功能",
    navOpenSource: "开源策略",
    heroTitle: "LeagueJax",
    heroCopy:
      "面向《英雄联盟》玩家的桌面伴侣工具，聚焦对局信息、玩家查询、回放管理和轻量更新体验。",
    githubDownload: "从 GitHub 下载",
    giteeDownload: "从 Gitee 下载",
    downloadNote:
      "Windows x64 安装包。页面会在可用时解析最新发布信息，并把按钮指向最新 exe 直链。",
    previewPhase: "实时会话",
    previewTitle: "选人阶段信息",
    previewHistory: "近期战绩",
    previewHistoryCaption: "最近 20 场",
    previewUpdater: "更新源",
    previewUpdaterCaption: "安装包直链",
    featuresTitle: "为对局前后的高频场景而做",
    featuresCopy:
      "LeagueJax 关注玩家在游戏前、中、后反复遇到的桌面操作，把信息整理得更集中。",
    featureMatchTitle: "对局信息",
    featureMatchCopy:
      "把当前阶段、队伍上下文和会话状态放在容易扫读的位置，减少频繁切换窗口。",
    featureHistoryTitle: "战绩与查询",
    featureHistoryCopy:
      "用于回顾近期表现、查看历史对局和查询玩家资料，服务复盘和信息整理。",
    featureOverlayTitle: "小窗体验",
    featureOverlayCopy:
      "在游戏过程中保留必要信息，保持低打扰、易阅读、可快速确认。",
    featureReplayTitle: "回放与工具",
    featureReplayCopy: "逐步集中回放管理、客户端辅助操作和其他实用工具。",
    openSourceTitle: "部分开源的产品边界",
    openSourceCopy:
      "LeagueJax 会公开产品外壳、界面、基础能力和适合公开的项目内容；部分核心实现不放在公开仓库中，以降低低成本套壳滥用风险。",
    licenseLabel: "许可协议",
    licenseCopy:
      "公开仓库中的源文件和资源受 GPL-3.0 约束。部分未公开组件不在公开仓库中提供。",
    originTitle: "为什么会有这个项目",
    originCopy:
      "LeagueJax 的诞生和 League Akari 的部分开源方向有关。它是一个独立项目，用于学习和实践 Tauri 桌面应用开发，同时做一套更贴近自己使用习惯的玩家工具。",
    disclaimer:
      "LeagueJax 是非官方项目，与 Riot Games、腾讯游戏或 League of Legends 官方没有从属、赞助或认可关系。",
    sourceLink: "GitHub 源码",
  },
  ja: {
    navDownloads: "ダウンロード",
    navFeatures: "機能",
    navOpenSource: "公開方針",
    heroTitle: "LeagueJax",
    heroCopy:
      "League of Legends プレイヤー向けのデスクトップコンパニオン。試合情報、プレイヤー検索、リプレイ、軽量な更新体験を扱います。",
    githubDownload: "GitHub からダウンロード",
    giteeDownload: "Gitee からダウンロード",
    downloadNote:
      "Windows x64 インストーラーです。リリース情報を取得できる場合、ボタンは最新 exe の直接リンクに更新されます。",
    previewPhase: "ライブセッション",
    previewTitle: "チャンピオン選択の情報",
    previewHistory: "最近の履歴",
    previewHistoryCaption: "直近 20 試合",
    previewUpdater: "更新ソース",
    previewUpdaterCaption: "インストーラー直リンク",
    featuresTitle: "試合前後の場面に向けて",
    featuresCopy:
      "LeagueJax は、通常のプレイ前後で繰り返し発生するデスクトップ作業を整理します。",
    featureMatchTitle: "試合情報",
    featureMatchCopy:
      "現在の段階、チーム情報、セッション状態を確認しやすくし、ウィンドウ切り替えを減らします。",
    featureHistoryTitle: "戦績と検索",
    featureHistoryCopy:
      "最近の成績、過去の試合、プレイヤー情報を振り返りと情報整理のために確認できます。",
    featureOverlayTitle: "軽量ウィンドウ",
    featureOverlayCopy:
      "プレイ中に必要な情報を残し、邪魔になりにくく読みやすい形で表示します。",
    featureReplayTitle: "リプレイとツール",
    featureReplayCopy:
      "リプレイ管理、クライアント補助操作、その他の実用ツールを段階的に集約します。",
    openSourceTitle: "部分的なオープンソース方針",
    openSourceCopy:
      "LeagueJax は、製品の外側、画面、基盤、公開に適した内容を公開し、一部の中核実装は公開リポジトリに含めません。",
    licenseLabel: "ライセンス",
    licenseCopy:
      "公開リポジトリ内のソースファイルとリソースは GPL-3.0 に従います。非公開コンポーネントは公開リポジトリには含まれません。",
    originTitle: "このプロジェクトについて",
    originCopy:
      "LeagueJax は League Akari の部分的なオープンソース方針に関連して生まれた独立プロジェクトです。Tauri デスクトップ開発を学び、実践するための場でもあります。",
    disclaimer:
      "LeagueJax は非公式プロジェクトであり、Riot Games、Tencent Games、League of Legends 公式とは関係ありません。",
    sourceLink: "GitHub のソース",
  },
};

const findInstallerAsset = (release) => {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return assets.find((asset) => {
    const name = String(asset?.name ?? "");
    return (
      name.endsWith(".exe") && name.includes("x64") && name.includes("setup")
    );
  });
};

const installerNameForTag = (tagName) => {
  const version = String(tagName || currentTag).replace(/^v/u, "");
  return `LeagueJax_${version}_x64-setup.exe`;
};

const resolveDownloadUrl = (source, release) => {
  const tagName = release?.tag_name || release?.tagName || currentTag;
  const asset = findInstallerAsset(release);
  const directUrl =
    asset?.browser_download_url || asset?.download_url || asset?.url || null;

  if (directUrl) {
    return directUrl;
  }

  const fileName = asset?.name || installerNameForTag(tagName);
  return `${source.releaseBase}/${tagName}/${fileName}`;
};

const hydrateDownloadLink = async (key, elementId) => {
  const link = document.getElementById(elementId);
  const source = releaseSources[key];

  if (!link || !source) {
    return;
  }

  link.href = link.dataset.fallbackHref || source.fallback;

  try {
    const response = await fetch(source.api, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return;
    }

    const release = await response.json();
    link.href = resolveDownloadUrl(source, release);
  } catch {
    link.href = link.dataset.fallbackHref || source.fallback;
  }
};

const setLanguage = (language) => {
  const dictionary = translations[language] || translations.en;
  document.documentElement.lang =
    language === "zh" ? "zh-CN" : language === "ja" ? "ja" : "en";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const value = key ? dictionary[key] : undefined;
    if (value) {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.language === language);
  });

  localStorage.setItem("leaguejax-language", language);
};

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.language || "en");
  });
});

const storedLanguage = localStorage.getItem("leaguejax-language");
const browserLanguage = navigator.language.startsWith("zh")
  ? "zh"
  : navigator.language.startsWith("ja")
    ? "ja"
    : "en";

setLanguage(storedLanguage || browserLanguage);
void hydrateDownloadLink("github", "githubDownload");
void hydrateDownloadLink("gitee", "giteeDownload");
