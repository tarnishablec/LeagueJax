import type { Resource } from "i18next";

export const i18nShardI18n: Resource = {
  en: {
    settings: {
      language: {
        label: "Language",
        hint: "Some text may follow the League client's language instead of this setting.",
        zhCN: "Simplified Chinese",
        en: "English",
        jaJP: "Japanese",
      },
    },
  },
  "zh-CN": {
    settings: {
      language: {
        label: "语言",
        hint: "部分文本会跟随英雄联盟客户端语言，而不是这个设置。",
        zhCN: "简体中文",
        en: "English",
        jaJP: "日本語",
      },
    },
  },
  "ja-JP": {
    settings: {
      language: {
        label: "言語",
        hint: "一部のテキストはこの設定ではなく、League クライアントの言語設定に従います。",
        zhCN: "簡体字中国語",
        en: "英語",
        jaJP: "日本語",
      },
    },
  },
};
