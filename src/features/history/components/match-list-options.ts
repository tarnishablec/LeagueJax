import type { MatchModeTag } from "../types/match-mode";

export const modeOptions: Array<{
  value: MatchModeTag;
  labelKey: string;
}> = [
  { value: "all", labelKey: "history.mode.all" },
  { value: "q_420", labelKey: "history.mode.q420" },
  { value: "q_430", labelKey: "history.mode.q430" },
  { value: "q_440", labelKey: "history.mode.q440" },
  { value: "q_450", labelKey: "history.mode.q450" },
  { value: "q_480", labelKey: "history.mode.q480" },
  { value: "q_1700", labelKey: "history.mode.q1700" },
  { value: "q_490", labelKey: "history.mode.q490" },
  { value: "q_1900", labelKey: "history.mode.q1900" },
  { value: "q_900", labelKey: "history.mode.q900" },
  { value: "q_2300", labelKey: "history.mode.q2300" },
];

export const pageSizeOptions = [20, 50, 100] as const;

export const placeholderFilterOptions = [
  { value: "all", labelKey: "history.filter.all" },
  { value: "preset_a", labelKey: "history.filter.presetA" },
  { value: "preset_b", labelKey: "history.filter.presetB" },
] as const;
