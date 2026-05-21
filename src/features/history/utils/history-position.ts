export function normalizeHistoryPosition(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || normalized === "INVALID") {
    return null;
  }
  if (normalized === "NONE") {
    return null;
  }

  if (normalized === "AFK") {
    return null;
  }

  return normalized;
}
