import type {
  OngoingGamePlayerSnapshot,
  PlayerSlot,
} from "@/bindings/ongoing_game";
import type { TeamCardEntry } from "./ongoing-game.types";

export function isBotPuuid(rawPuuid: string): boolean {
  const puuid = rawPuuid.trim().toUpperCase();
  return !puuid || puuid === "BOT" || puuid.startsWith("BOT_");
}

export function isBotPlayer(player: OngoingGamePlayerSnapshot): boolean {
  if (player.is_bot) {
    return true;
  }

  if (isBotPuuid(player.puuid)) {
    return true;
  }

  const gameName = (player.summoner.gameName ?? "").trim().toUpperCase();
  const summonerName = (player.summoner.name ?? "").trim().toUpperCase();

  if (gameName === "BOT" || gameName.startsWith("BOT_")) {
    return true;
  }

  return summonerName === "BOT" || summonerName.startsWith("BOT_");
}

export function isBotSlot(slot: PlayerSlot): boolean {
  if (slot.is_bot) {
    return true;
  }

  return isBotPuuid(slot.puuid);
}

export function formatName(player: OngoingGamePlayerSnapshot): string {
  const gameName = player.summoner.gameName?.trim();
  const tagLine = player.summoner.tagLine?.trim();

  if (gameName && tagLine) {
    return `${gameName}#${tagLine}`;
  }

  if (gameName) {
    return gameName;
  }

  if (player.summoner.name?.trim()) {
    return player.summoner.name;
  }

  return player.puuid;
}

export function formatRank(player: OngoingGamePlayerSnapshot): string {
  const entry =
    player.ranked?.highestRankedEntrySr ?? player.ranked?.highestRankedEntry;

  if (!entry || !entry.tier || entry.tier === "NONE") {
    return "";
  }

  if (entry.division === "NA") {
    return `${entry.tier} ${entry.leaguePoints}LP`;
  }

  return `${entry.tier} ${entry.division} ${entry.leaguePoints}LP`;
}

export function toTeamCardEntries(
  players: OngoingGamePlayerSnapshot[],
  slots: PlayerSlot[],
): TeamCardEntry[] {
  const entries: TeamCardEntry[] = [];
  const playerByPuuid = new Map(
    players.map((player) => [player.puuid, player]),
  );
  const slotPuuids = new Set(slots.map((slot) => slot.puuid));

  for (const [index, slot] of slots.entries()) {
    const player = playerByPuuid.get(slot.puuid);
    if (player) {
      entries.push({
        kind: "player",
        key: `player:${player.puuid}:${index}`,
        player,
        championId: player.champion_id ?? slot.champion_id,
        isBot: isBotPlayer(player),
      });
      continue;
    }

    entries.push({
      kind: "slot",
      key: `slot:${slot.puuid}:${index}`,
      slot,
      isBot: isBotSlot(slot),
    });
  }

  for (const player of players) {
    if (slotPuuids.has(player.puuid)) {
      continue;
    }

    entries.push({
      kind: "player",
      key: `player-extra:${player.puuid}`,
      player,
      championId: player.champion_id,
      isBot: isBotPlayer(player),
    });
  }

  return entries;
}
