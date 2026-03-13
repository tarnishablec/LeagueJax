const CDRAGON_BASE = "https://raw.communitydragon.org";

export function championIconUrl(version: string, championId: number): string {
  return `${CDRAGON_BASE}/${version}/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}
