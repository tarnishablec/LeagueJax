import type { Resource } from "i18next";

export const miniI18n: Resource = {
  en: {
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
      },
    },
  },
  "zh-CN": {
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
      },
    },
  },
  "ja-JP": {
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
      },
    },
  },
};
