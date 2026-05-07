export function resolveProfileIconAssetPath(
  profileIconId: number | null | undefined,
): string | null {
  if (
    typeof profileIconId !== "number" ||
    !Number.isFinite(profileIconId) ||
    profileIconId <= 0
  ) {
    return null;
  }

  return `/lol-game-data/assets/v1/profile-icons/${Math.trunc(profileIconId)}.jpg`;
}
