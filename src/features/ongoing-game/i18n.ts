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
          interaction: {
            title: "Interaction",
          },
          matchmaking: {
            title: "Matchmaking",
          },
          playerCardTags: {
            title: "Player card tags",
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
        matchmaking: {
          autoAccept: {
            label: "Auto Accept Ready Check",
            hint: "Automatically accept the ready check before champion select starts.",
          },
          acceptDelaySeconds: {
            label: "Accept Delay (s)",
            hint: "Wait this many seconds before accepting the ready check.",
          },
        },
        playerCardTags: {
          description:
            "Choose which tags can appear on player cards. Excellent follows the MVP/ACE strategy in History settings.",
          savedColors: "Saved Colors",
          squadDetection: {
            enabled: {
              label: "Enable squad detection",
              hint: "Detect premade squads from recent same-team match history.",
            },
            minGames: {
              label: "Squad detection game threshold",
              hint: "Two players must appear on the same team at least this many times before being marked as a squad.",
            },
          },
          items: {
            winStreak: "Win streak",
            loseStreak: "Lose streak",
            averageSoloKills: "Average solo kills",
            excellent: "Excellent mark",
            offFlashPosition: "Flash position check",
            hiddenCareer: "Hidden career mark",
            self: "Self mark",
            encountered: "Encountered player",
          },
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
      rank: {
        soloShort: "Solo",
        flexShort: "Flex",
        lpShort: "LP",
      },
      winRate: "Win rate",
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
      playerTags: {
        winStreak: "{{count}} wins",
        loseStreak: "{{count}} losses",
        averageSoloKills: "{{value}} solo kills",
        excellent: "Excellent",
        offFlashPosition: "Flash moved",
        hiddenCareer: "Hidden",
        self: "Self",
        squad: "Squad {{number}}",
        encountered: "Met",
      },
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
          interaction: {
            title: "交互",
          },
          matchmaking: {
            title: "匹配",
          },
          playerCardTags: {
            title: "玩家卡片标签",
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
        matchmaking: {
          autoAccept: {
            label: "自动接受对局",
            hint: "在进入英雄选择前自动接受 ready check。",
          },
          acceptDelaySeconds: {
            label: "接受延迟（秒）",
            hint: "检测到 ready check 后，延迟这么多秒再发送接受请求。",
          },
        },
        playerCardTags: {
          description:
            "这些标签会展示在玩家卡片上。优异标记会跟随战绩设置中的 MVP/ACE 策略。",
          savedColors: "保存的颜色",
          squadDetection: {
            enabled: {
              label: "启用小队检测",
              hint: "根据最近同队对局记录检测当前对局中的小队。",
            },
            minGames: {
              label: "小队检测阈值对局数",
              hint: "两名玩家至少同队出现这么多场，才会被判定为同一小队。",
            },
          },
          items: {
            winStreak: "连胜场次",
            loseStreak: "连败场次",
            averageSoloKills: "场均单杀次数",
            excellent: "优异标记",
            offFlashPosition: "闪现异常位置检测",
            hiddenCareer: "生涯隐藏标记",
            self: "自己标记",
            encountered: "遇到过的玩家",
          },
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
      rank: {
        soloShort: "单双",
        flexShort: "灵活",
        lpShort: "胜点",
      },
      winRate: "胜率",
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
      playerTags: {
        winStreak: "{{count}} 连胜",
        loseStreak: "{{count}} 连败",
        averageSoloKills: "{{value}} 单杀",
        excellent: "优异",
        offFlashPosition: "闪现异位",
        hiddenCareer: "生涯隐藏",
        self: "自己",
        squad: "小队{{number}}",
        encountered: "遇到过",
      },
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
          interaction: {
            title: "操作",
          },
          matchmaking: {
            title: "マッチメイキング",
          },
          playerCardTags: {
            title: "プレイヤーカードタグ",
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
        matchmaking: {
          autoAccept: {
            label: "対局を自動承諾",
            hint: "チャンピオン選択に入る前に ready check を自動で承諾します。",
          },
          acceptDelaySeconds: {
            label: "承諾遅延（秒）",
            hint: "ready check を検出してから承諾するまでの待機時間です。",
          },
        },
        playerCardTags: {
          description:
            "プレイヤーカードに表示するタグを選択します。優秀マークは戦績設定のMVP/ACE戦略に従います。",
          savedColors: "保存した色",
          squadDetection: {
            enabled: {
              label: "パーティー検出を有効化",
              hint: "最近同じチームでプレイした履歴から現在の対局のパーティーを検出します。",
            },
            minGames: {
              label: "パーティー検出の試合数しきい値",
              hint: "2人のプレイヤーがこの回数以上同じチームにいた場合に、同じパーティーとして判定します。",
            },
          },
          items: {
            winStreak: "連勝数",
            loseStreak: "連敗数",
            averageSoloKills: "平均ソロキル",
            excellent: "優秀マーク",
            offFlashPosition: "フラッシュ位置チェック",
            hiddenCareer: "戦績非公開マーク",
            self: "自分マーク",
            encountered: "遭遇済みプレイヤー",
          },
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
      rank: {
        soloShort: "ソロ",
        flexShort: "フレックス",
        lpShort: "LP",
      },
      winRate: "勝率",
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
      playerTags: {
        winStreak: "{{count}}連勝",
        loseStreak: "{{count}}連敗",
        averageSoloKills: "{{value}}ソロキル",
        excellent: "優秀",
        offFlashPosition: "フラッシュ異位置",
        hiddenCareer: "戦績非公開",
        self: "自分",
        squad: "パーティー{{number}}",
        encountered: "遭遇済み",
      },
    },
  },
};
