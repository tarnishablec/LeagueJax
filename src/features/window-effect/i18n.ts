import type { Resource } from "i18next";

export const windowEffectI18n: Resource = {
  en: {
    settings: {
      windowEffect: {
        label: "Window Effect",
        hint: "Choose whether to use translucency and which effect to use.",
        options: {
          none: "None",
          mica: "Mica",
          acrylic: "Acrylic",
          vibrancy: "Vibrancy",
        },
      },
      windowEffectBaseColor: {
        label: "Window Effect Base Color",
        hint: "Sets the translucent base color drawn above every window effect. Lower alpha keeps Mica and Acrylic visible.",
      },
    },
  },
  "zh-CN": {
    settings: {
      windowEffect: {
        label: "背景材质",
        hint: "选择是否启用窗口背景材质，以及使用哪种效果。",
        options: {
          none: "无",
          mica: "Mica",
          acrylic: "Acrylic",
          vibrancy: "Vibrancy",
        },
      },
      windowEffectBaseColor: {
        label: "背景基色",
        hint: "设置所有窗口背景材质之上的半透明基色。降低透明度可以保留 Mica 和 Acrylic 的质感。",
      },
    },
  },
  "ja-JP": {
    settings: {
      windowEffect: {
        label: "背景マテリアル",
        hint: "ウィンドウの背景材質を有効にするか、どの効果を使うかを選択します。",
        options: {
          none: "なし",
          mica: "Mica",
          acrylic: "Acrylic",
          vibrancy: "Vibrancy",
        },
      },
      windowEffectBaseColor: {
        label: "背景ベースカラー",
        hint: "すべてのウィンドウ背景効果の上に重ねる半透明の基準色を設定します。アルファを下げると Mica と Acrylic の質感が残ります。",
      },
    },
  },
};
