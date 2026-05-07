export type PlayerCardAvatarSource =
  | {
      kind: "champion";
      championId: number;
    }
  | {
      kind: "profile";
      profileIconId: number | null | undefined;
    };

export function resolvePlayerCardAvatarSource({
  championId,
  profileIconId,
}: {
  championId: number | null | undefined;
  profileIconId: number | null | undefined;
}): PlayerCardAvatarSource {
  if (
    typeof championId === "number" &&
    Number.isFinite(championId) &&
    championId > 0
  ) {
    return {
      kind: "champion",
      championId,
    };
  }

  return {
    kind: "profile",
    profileIconId,
  };
}
