import type { Resource } from "i18next";

export const ongoingGameI18n: Resource = {
  en: {
    nav: {
      game: "Game",
    },
    settings: {
      pages: {
        ongoing: {
          title: "Ongoing",
        },
      },
      sections: {
        ongoing: {
          behavior: {
            title: "Behavior",
          },
        },
      },
      ongoing: {
        matchHistoryCount: {
          label: "Match history count",
        },
        autoSwitchToGame: {
          label: "Auto switch to game page",
        },
        showBots: {
          label: "Show bot players",
        },
      },
    },
    ongoingGame: {
      status: "Status",
      loading: "Loading",
      phase: "Phase",
      ourSide: "Our Side",
      titlebar: {
        idle: "No active game",
        sideBlue: "Blue Side",
        sideRed: "Red Side",
        sideUnknown: "Unknown Side",
        modeUnknown: "Unknown Mode",
        mapUnknown: "Unknown Map",
        filterCurrentMode: "Current Mode",
        filterAllModes: "All Modes",
        refreshAria: "Refresh ongoing game",
      },
      blueTeam: "Blue Team",
      redTeam: "Red Team",
      noData: "No player data yet",
      noRanked: "No ranked data",
      recentGames: "Recent games",
      noHistory: "No match history",
      historyLoadFailed: "Failed to load history, refresh to retry",
      botNoHistory: "Bot (history disabled)",
      idleEmpty: "No ongoing game",
      historyResultWin: "Win",
      historyResultLose: "Lose",
      historyResultRemake: "Remake",
      historyResultTerminated: "Terminated",
      cs: "CS",
      level: "Lv",
    },
  },
  "zh-CN": {
    nav: {
      game: "对局",
    },
    settings: {
      pages: {
        ongoing: {
          title: "对局",
        },
      },
      sections: {
        ongoing: {
          behavior: {
            title: "行为",
          },
        },
      },
      ongoing: {
        matchHistoryCount: {
          label: "战绩分析对局数",
        },
        autoSwitchToGame: {
          label: "进入对局时自动切换到对局页",
        },
        showBots: {
          label: "显示机器人卡片",
        },
      },
    },
    ongoingGame: {
      status: "状态",
      loading: "加载中",
      phase: "阶段",
      ourSide: "己方",
      titlebar: {
        idle: "暂无进行中对局",
        sideBlue: "蓝色方",
        sideRed: "红色方",
        sideUnknown: "阵营未知",
        modeUnknown: "模式未知",
        mapUnknown: "地图未知",
        filterCurrentMode: "当前模式",
        filterAllModes: "全部模式",
        refreshAria: "刷新当前对局",
      },
      blueTeam: "蓝色方",
      redTeam: "红色方",
      noData: "暂无玩家数据",
      noRanked: "无排位数据",
      recentGames: "最近对局",
      noHistory: "暂无战绩",
      historyLoadFailed: "战绩加载失败，请手动刷新重试",
      botNoHistory: "机器人（不查战绩）",
      idleEmpty: "没有进行中的对局",
      historyResultWin: "胜利",
      historyResultLose: "失败",
      historyResultRemake: "重开",
      historyResultTerminated: "终止",
      cs: "补刀",
      level: "等级",
    },
  },
  "ja-JP": {
    nav: {
      game: "対局",
    },
    settings: {
      pages: {
        ongoing: {
          title: "対局",
        },
      },
      sections: {
        ongoing: {
          behavior: {
            title: "動作",
          },
        },
      },
      ongoing: {
        matchHistoryCount: {
          label: "戦績分析の試合数",
        },
        autoSwitchToGame: {
          label: "対局開始時に自動で対局ページへ切り替える",
        },
        showBots: {
          label: "BOTカードを表示する",
        },
      },
    },
    ongoingGame: {
      status: "状態",
      loading: "読み込み中",
      phase: "フェーズ",
      ourSide: "自チーム",
      titlebar: {
        idle: "進行中の対局はありません",
        sideBlue: "青チーム",
        sideRed: "赤チーム",
        sideUnknown: "不明なチーム",
        modeUnknown: "不明なモード",
        mapUnknown: "不明なマップ",
        filterCurrentMode: "現在のモード",
        filterAllModes: "すべてのモード",
        refreshAria: "進行中の対局を更新",
      },
      blueTeam: "青チーム",
      redTeam: "赤チーム",
      noData: "プレイヤーデータがまだありません",
      noRanked: "ランクデータなし",
      recentGames: "最近の試合",
      noHistory: "戦績なし",
      historyLoadFailed:
        "戦績の読み込みに失敗しました。手動更新で再試行してください",
      botNoHistory: "BOT（戦績取得なし）",
      idleEmpty: "進行中の対局はありません",
      historyResultWin: "勝利",
      historyResultLose: "敗北",
      historyResultRemake: "リメイク",
      historyResultTerminated: "中断",
      cs: "CS",
      level: "Lv",
    },
  },
};
