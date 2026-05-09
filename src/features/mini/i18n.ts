import type { Resource } from "i18next";

export const miniI18n: Resource = {
  en: {
    mini: {
      phase: {
        idle: "Idle",
        matchmaking: "Matchmaking",
        readyCheck: "Ready Check",
        champSelect: "Champion Select",
        inGame: "In Game",
        spectating: "Watching",
      },
      queue: {
        empty: "No active queue",
        unknown: "Current queue",
      },
      autoAccept: {
        countdown: "Auto accept: {{count}}s",
      },
      controls: {
        pinTooltip: "Dock to League Client",
        alwaysOnTopTooltip: "Always on Top",
      },
      champSelect: {
        selected: "Selected",
        notSelected: "Not selected",
        status: {
          completed: "Champion Select (Completed)",
          pending: "Champion Select",
        },
        swapFailed: "Failed to switch champion",
        dodge: {
          title: "Dodge Champion Select",
          pending: "Dodging",
          action: "Dodge Now",
          failed: "Failed to dodge champion select",
        },
      },
    },
    settings: {
      pages: {
        mini: {
          title: "Mini",
        },
      },
      sections: {
        mini: {
          preference: {
            title: "Preference",
          },
        },
      },
      mini: {
        autoOpen: {
          label: "Auto Open Mini Window",
          hint: "Open the mini window automatically when a focused League client is detected.",
        },
        pin: {
          label: "Pin Mini Window",
          hint: "Keep the mini window docked to the League client while the client is available.",
        },
        alwaysOnTop: {
          label: "Always on Top",
          hint: "Keep the mini window above other windows.",
        },
      },
    },
  },
  "zh-CN": {
    mini: {
      phase: {
        idle: "空闲",
        matchmaking: "队列中",
        readyCheck: "接受对局",
        champSelect: "英雄选择",
        inGame: "游戏中",
        spectating: "观战中",
      },
      queue: {
        empty: "暂无活动",
        unknown: "当前队列",
      },
      autoAccept: {
        countdown: "自动接受：{{count}}秒",
      },
      controls: {
        pinTooltip: "吸附 LOL 客户端",
        alwaysOnTopTooltip: "窗口置顶",
      },
      champSelect: {
        selected: "已选择",
        notSelected: "未选择",
        status: {
          completed: "英雄选择（已完成）",
          pending: "英雄选择",
        },
        swapFailed: "切换英雄失败",
        dodge: {
          title: "退出英雄选择",
          pending: "秒退中",
          action: "立即秒退",
          failed: "退出英雄选择失败",
        },
      },
    },
    settings: {
      pages: {
        mini: {
          title: "小窗",
        },
      },
      sections: {
        mini: {
          preference: {
            title: "偏好",
          },
        },
      },
      mini: {
        autoOpen: {
          label: "自动打开小窗",
          hint: "检测到已聚焦的英雄联盟客户端时，自动打开小窗。",
        },
        pin: {
          label: "钉住小窗",
          hint: "启用后，只要英雄联盟客户端可用，小窗就会持续吸附在客户端右侧。",
        },
        alwaysOnTop: {
          label: "窗口置顶",
          hint: "让小窗保持在其他窗口上方。",
        },
      },
    },
  },
  "ja-JP": {
    mini: {
      phase: {
        idle: "待機中",
        matchmaking: "マッチメイキング",
        readyCheck: "準備確認",
        champSelect: "チャンピオン選択",
        inGame: "ゲーム中",
        spectating: "観戦中",
      },
      queue: {
        empty: "アクティブなキューなし",
        unknown: "現在のキュー",
      },
      autoAccept: {
        countdown: "自動承認: {{count}}秒",
      },
      controls: {
        pinTooltip: "League クライアントに吸着",
        alwaysOnTopTooltip: "常に最前面",
      },
      champSelect: {
        selected: "選択済み",
        notSelected: "未選択",
        status: {
          completed: "チャンピオン選択（完了）",
          pending: "チャンピオン選択",
        },
        swapFailed: "チャンピオンの切り替えに失敗しました",
        dodge: {
          title: "チャンピオン選択をドッジ",
          pending: "ドッジ中",
          action: "今すぐドッジ",
          failed: "チャンピオン選択のドッジに失敗しました",
        },
      },
    },
    settings: {
      pages: {
        mini: {
          title: "ミニ",
        },
      },
      sections: {
        mini: {
          preference: {
            title: "設定",
          },
        },
      },
      mini: {
        autoOpen: {
          label: "ミニウィンドウを自動で開く",
          hint: "フォーカス中の League クライアントを検出したとき、ミニウィンドウを自動で開きます。",
        },
        pin: {
          label: "ミニウィンドウを固定",
          hint: "有効にすると、League クライアントが利用できる間はミニウィンドウを右側に吸着し続けます。",
        },
        alwaysOnTop: {
          label: "常に最前面",
          hint: "ミニウィンドウを他のウィンドウより前に表示します。",
        },
      },
    },
  },
};
