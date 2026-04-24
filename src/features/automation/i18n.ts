import type { Resource } from "i18next";

export const automationI18n: Resource = {
  en: {
    nav: {
      automation: "Automation",
    },
    settings: {
      pages: {
        matchmaking: {
          title: "Matchmaking",
        },
      },
      sections: {
        matchmaking: {
          interaction: {
            title: "Interaction",
          },
        },
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
    },
  },
  "zh-CN": {
    nav: {
      automation: "自动化",
    },
    settings: {
      pages: {
        matchmaking: {
          title: "匹配",
        },
      },
      sections: {
        matchmaking: {
          interaction: {
            title: "交互",
          },
        },
      },
      matchmaking: {
        autoAccept: {
          label: "自动接受对局",
          hint: "在进入英雄选择前，自动接受 ready check。",
        },
        acceptDelaySeconds: {
          label: "接受延迟（秒）",
          hint: "检测到 ready check 后，延迟这么多秒再发送接受请求。",
        },
      },
    },
  },
  "ja-JP": {
    nav: {
      automation: "自動化",
    },
    settings: {
      pages: {
        matchmaking: {
          title: "マッチング",
        },
      },
      sections: {
        matchmaking: {
          interaction: {
            title: "操作",
          },
        },
      },
      matchmaking: {
        autoAccept: {
          label: "自動で対局を承諾",
          hint: "チャンピオン選択に入る前の ready check を自動で承諾します。",
        },
        acceptDelaySeconds: {
          label: "承諾遅延（秒）",
          hint: "ready check を検出してから承諾するまでの待機時間です。",
        },
      },
    },
  },
};
