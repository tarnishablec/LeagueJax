import { useMemo } from "react";
import type { LanePosition } from "@/bindings/lane.ts";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { useDragonStaticData } from "@/hooks/use-dragon-static-data";

export type RoleQuestSlot =
  | { kind: "quest"; iconUrl: string }
  | { kind: "item"; itemId: number; iconUrl: string | null };

export type RoleQuestResult = {
  inferredPosition: LanePosition | null;
  slot: RoleQuestSlot | null;
};

const ROLE_QUEST_ITEM_MAP: Record<
  number,
  { lane: LanePosition; iconBase: string }
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

function buildQuestIconUrl(iconBase: string, completed: boolean): string {
  const state =
    iconBase === "rolequest_supportreward"
      ? completed
        ? "empty"
        : "inprogress"
      : completed
        ? "complete"
        : "inprogress";
  return `${ICON_HOST}/${iconBase}_${state}.png`;
}

export function useRoleQuestSlot({
  participant,
  match,
}: {
  participant: RawMatchSummaryParticipant;
  match: RawMatchSummaryGame;
}): RoleQuestResult {
  const roleBoundItem = participant.roleBoundItem;
  const { mapId, gameMode } = match.json;
  const supportsPosition =
    mapId === SUMMONERS_RIFT_MAP_ID ||
    gameMode.toUpperCase() === CLASSIC_GAME_MODE;
  const completed = participant.missions?.[ROLE_QUEST_COMPLETE_KEY] === 1;

  const itemQueryParams = useMemo(
    () => [{ type: "item" as const, itemId: roleBoundItem }],
    [roleBoundItem],
  );
  const [itemAsset] = useDragonStaticData(itemQueryParams);
  const iconSrc = itemAsset?.src ?? null;

  return useMemo<RoleQuestResult>(() => {
    if (!roleBoundItem) {
      return { inferredPosition: null, slot: null };
    }

    const mapping = ROLE_QUEST_ITEM_MAP[roleBoundItem];

    if (mapping) {
      return {
        inferredPosition: mapping.lane,
        slot: supportsPosition
          ? {
              kind: "quest",
              iconUrl: buildQuestIconUrl(mapping.iconBase, completed),
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
  }, [supportsPosition, roleBoundItem, completed, iconSrc]);
}
