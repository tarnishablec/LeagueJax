export const OPGG_COUNTER_COLUMN_LIMIT_SETTING =
  "opgg.matchups.counterColumnLimit";
export const DEFAULT_COUNTER_COLUMN_LIMIT = 8;

export function parseCounterColumnLimit(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 50
    ? value
    : undefined;
}
