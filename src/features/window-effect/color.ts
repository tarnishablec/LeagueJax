const HEX_COLOR_WITH_OPTIONAL_ALPHA = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const WINDOW_EFFECT_SETTING_ID = "system.preferences.windowEffect";
export const WINDOW_EFFECT_NONE = "none";
export const WINDOW_EFFECT_BASE_COLOR_SETTING_ID =
  "system.preferences.windowEffectBaseColor";
export const WINDOW_EFFECT_BASE_COLOR_DEFAULT = "#00000000";
export const WINDOW_EFFECT_BASE_COLOR_PRESETS = [
  WINDOW_EFFECT_BASE_COLOR_DEFAULT,
  "#F8F8F878",
  "#202020A0",
  "#0B102066",
  "#C9932F59",
] as const;

export function isWindowEffectBaseColor(value: string): boolean {
  return HEX_COLOR_WITH_OPTIONAL_ALPHA.test(value);
}

export function normalizeWindowEffectBaseColor(value: unknown): string {
  if (typeof value !== "string") {
    return WINDOW_EFFECT_BASE_COLOR_DEFAULT;
  }

  const normalized = value.trim();
  return isWindowEffectBaseColor(normalized)
    ? normalized.toUpperCase()
    : WINDOW_EFFECT_BASE_COLOR_DEFAULT;
}
