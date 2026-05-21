export type LocaleCode = "en" | "zh-CN" | "ja-JP";
export type LocaleDictionary = Record<string, unknown>;
export type LocaleResource = Partial<Record<LocaleCode, LocaleDictionary>>;
