import { useMemo } from "react";
import type { LanePosition } from "@/bindings/lane.ts";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { useCdragonStaticData } from "@/hooks/use-cdragon-static-data";

export type RoleQuestSlot =
  | { kind: "quest"; iconUrl: string }
  | { kind: "item"; itemId: number; iconUrl: string | null };

export type RoleQuestResult = {
  inferredPosition: LanePosition | null;
  slot: RoleQuestSlot | null;
};

const ROLE_QUEST_ITEM_MAP: Record<
  number,
  {
    lane: LanePosition;
    iconBase: string;
  }
> = {
  1200: { lane: "top", iconBase: "rolequest_topreward1" },
  1201: { lane: "middle", iconBase: "rolequest_midreward" },
  1202: { lane: "bottom", iconBase: "rolequest_botreward" },
  1203: { lane: "utility", iconBase: "rolequest_supportreward" },
  1204: { lane: "jungle", iconBase: "rolequest_junglereward" },
  1207: { lane: "bottom", iconBase: "rolequest_botreward" },
  1206: { lane: "middle", iconBase: "rolequest_midreward" },
  1208: { lane: "utility", iconBase: "rolequest_supportreward" },
  1209: { lane: "jungle", iconBase: "rolequest_junglereward" },
  1220: { lane: "top", iconBase: "rolequest_topreward2" },
  1221: { lane: "top", iconBase: "rolequest_topreward1" },
  1222: { lane: "top", iconBase: "rolequest_topreward1" },
};

const ICON_HOST =
  "https://raw.communitydragon.org/latest/game/assets/items/icons2d";

const ROLE_QUEST_COMPLETE_KEY = "2026_S1A1_SR_RoleQuestComplete" as const;

const SUMMONERS_RIFT_MAP_ID = 11;
const CLASSIC_GAME_MODE = "CLASSIC";
const COMPLETED_JUNGLE_QUEST_ITEM_ID = 1209;
const JUNGLE_QUEST_ITEM_IDS = new Set([1204, 1209]);
const JUNGLE_EGG_ITEM_IDS = new Set([1101, 1102, 1103]);

export function hasJungleRoleQuest(
  participant: RawMatchSummaryParticipant,
): boolean {
  return JUNGLE_QUEST_ITEM_IDS.has(participant.roleBoundItem ?? 0);
}

export function hasCompletedJungleRoleQuest(
  participant: RawMatchSummaryParticipant,
): boolean {
  return participant.roleBoundItem === COMPLETED_JUNGLE_QUEST_ITEM_ID;
}

function isJungleEggItemId(value: number | null | undefined): value is number {
  return (
    value !== null && value !== undefined && JUNGLE_EGG_ITEM_IDS.has(value)
  );
}

function buildItemIconUrl(fileName: string): string {
  return `${ICON_HOST}/${fileName}`;
}

function buildQuestIconUrl(iconBase: string, completed: boolean): string {
  const state =
    iconBase === "rolequest_supportreward"
      ? completed
        ? "empty"
        : "inprogress"
      : completed
        ? "complete"
        : "inprogress";
  return buildItemIconUrl(`${iconBase}_${state}.png`);
}

function buildJungleBuffIconUrl(itemId: number): string {
  return buildItemIconUrl(`${itemId}_buff.png`);
}

export function useRoleQuestSlot({
  participant,
  match,
  resolvedJungleEggItemId,
}: {
  participant: RawMatchSummaryParticipant;
  match: RawMatchSummaryGame;
  resolvedJungleEggItemId?: number | null;
}): RoleQuestResult {
  const roleBoundItem = participant.roleBoundItem;
  const { mapId, gameMode } = match.json;
  const supportsPosition =
    mapId === SUMMONERS_RIFT_MAP_ID ||
    gameMode.toUpperCase() === CLASSIC_GAME_MODE;
  const completed =
    participant.missions?.[ROLE_QUEST_COMPLETE_KEY] === 1 ||
    roleBoundItem === COMPLETED_JUNGLE_QUEST_ITEM_ID;

  const itemQueryParams = useMemo(
    () => [{ type: "item" as const, itemId: roleBoundItem }],
    [roleBoundItem],
  );
  const [itemAsset] = useCdragonStaticData(itemQueryParams);
  const iconSrc = itemAsset?.src ?? null;

  return useMemo<RoleQuestResult>(() => {
    if (!roleBoundItem) {
      return { inferredPosition: null, slot: null };
    }

    const mapping = ROLE_QUEST_ITEM_MAP[roleBoundItem];

    if (mapping) {
      const iconUrl =
        mapping.lane === "jungle" &&
        completed &&
        isJungleEggItemId(resolvedJungleEggItemId)
          ? buildJungleBuffIconUrl(resolvedJungleEggItemId)
          : buildQuestIconUrl(mapping.iconBase, completed);

      return {
        inferredPosition: mapping.lane,
        slot: supportsPosition
          ? {
              kind: "quest",
              iconUrl,
            }
          : null,
      };
    }

    return {
      inferredPosition: null,
      slot: supportsPosition
        ? {
            kind: "item",
            itemId: roleBoundItem,
            iconUrl: iconSrc,
          }
        : null,
    };
  }, [
    supportsPosition,
    roleBoundItem,
    completed,
    resolvedJungleEggItemId,
    iconSrc,
  ]);
}
