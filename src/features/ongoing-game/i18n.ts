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
      game: "\u5bf9\u5c40",
    },
    settings: {
      pages: {
        ongoing: {
          title: "\u5bf9\u5c40",
        },
      },
      sections: {
        ongoing: {
          behavior: {
            title: "\u884c\u4e3a",
          },
        },
      },
      ongoing: {
        matchHistoryCount: {
          label: "\u6218\u7ee9\u5206\u6790\u5bf9\u5c40\u6570",
        },
        autoSwitchToGame: {
          label:
            "\u8fdb\u5165\u5bf9\u5c40\u65f6\u81ea\u52a8\u5207\u6362\u5230\u5bf9\u5c40\u9875",
        },
        showBots: {
          label: "\u663e\u793a\u673a\u5668\u4eba\u5361\u7247",
        },
      },
    },
    ongoingGame: {
      status: "\u72b6\u6001",
      loading: "\u52a0\u8f7d\u4e2d",
      phase: "\u9636\u6bb5",
      ourSide: "\u6211\u65b9\u9635\u8425",
      titlebar: {
        idle: "\u6682\u65e0\u8fdb\u884c\u4e2d\u5bf9\u5c40",
        sideBlue: "\u84dd\u8272\u65b9",
        sideRed: "\u7ea2\u8272\u65b9",
        sideUnknown: "\u9635\u8425\u672a\u77e5",
        modeUnknown: "\u6a21\u5f0f\u672a\u77e5",
        mapUnknown: "\u5730\u56fe\u672a\u77e5",
        filterCurrentMode: "\u5f53\u524d\u6a21\u5f0f",
        filterAllModes: "\u5168\u90e8\u6a21\u5f0f",
        refreshAria: "\u5237\u65b0\u5f53\u524d\u5bf9\u5c40",
      },
      blueTeam: "\u84dd\u8272\u65b9",
      redTeam: "\u7ea2\u8272\u65b9",
      noData: "\u6682\u65e0\u73a9\u5bb6\u6570\u636e",
      noRanked: "\u65e0\u6392\u4f4d\u6570\u636e",
      recentGames: "\u6700\u8fd1\u5bf9\u5c40",
      noHistory: "\u6682\u65e0\u6218\u7ee9",
      botNoHistory: "\u673a\u5668\u4eba\uff08\u4e0d\u67e5\u6218\u7ee9\uff09",
      idleEmpty: "\u6ca1\u6709\u8fdb\u884c\u4e2d\u7684\u5bf9\u5c40",
      historyResultWin: "\u80dc\u5229",
      historyResultLose: "\u5931\u8d25",
      historyResultRemake: "\u91cd\u5f00",
      historyResultTerminated: "\u7ec8\u6b62",
      cs: "\u8865\u5200",
      level: "\u7b49\u7ea7",
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
