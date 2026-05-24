import type { LocaleResource } from "@/i18n/types";

export const debugI18n: LocaleResource = {
  en: {
    nav: {
      debugCommands: "Debug",
    },
    debugCommands: {
      title: "Debug Commands",
      empty: "No debug commands",
      output: "Output",
      copyOutput: "Copy debug command output",
      success: "Completed",
      failure: "Failed",
    },
  },
  "zh-CN": {
    nav: {
      debugCommands: "调试",
    },
    debugCommands: {
      title: "调试命令",
      empty: "暂无调试命令",
      output: "输出",
      copyOutput: "复制调试命令输出",
      success: "已完成",
      failure: "执行失败",
    },
  },
  "ja-JP": {
    nav: {
      debugCommands: "デバッグ",
    },
    debugCommands: {
      title: "デバッグコマンド",
      empty: "デバッグコマンドはありません",
      output: "出力",
      copyOutput: "デバッグコマンドの出力をコピー",
      success: "完了",
      failure: "失敗",
    },
  },
};
