const CDRAGON_SHARED_COMPONENTS_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default";
const CDRAGON_STATIC_MINI_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";

export function useRankIcon(tier: string | null | undefined, mini = false) {
  const normalized = (tier?.trim() || "UNRANKED").toLowerCase();
  if (mini) {
    return `${CDRAGON_STATIC_MINI_BASE}/${normalized}.svg`;
  }
  return `${CDRAGON_SHARED_COMPONENTS_BASE}/${normalized}.png`;
}
