import { HoverCard } from "@ark-ui/react/hover-card";
import { Portal } from "@ark-ui/react/portal";
import { useMemo } from "react";
import { useCdragonCherryAugments } from "../../hooks/use-cdragon-cherry-augments";
import * as s from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";
import { CDRAGON_GAME_DATA_BASE } from "./match-card-display";

const AUGMENT_SLOT_KEYS = [
  "slot1",
  "slot2",
  "slot3",
  "slot4",
  "slot5",
  "slot6",
] as const;

function normalizeAugmentIconPath(iconPath: string): string {
  const normalized = iconPath.replace(/\\/g, "/");
  const encoded = encodeURI(
    normalized
      .replace(/\.dds$/i, ".png")
      .replace(/\.tex$/i, ".png")
      .replace(/\.jpg$/i, ".png")
      .replace(/\.jpeg$/i, ".png"),
  );
  if (encoded.startsWith("/lol-game-data/assets")) {
    return `${CDRAGON_GAME_DATA_BASE}${encoded.replace("/lol-game-data/assets", "")}`;
  }
  if (encoded.startsWith("/")) {
    return `${CDRAGON_GAME_DATA_BASE}${encoded}`;
  }
  return `${CDRAGON_GAME_DATA_BASE}/${encoded}`;
}

function normalizeAugmentIconPathLowercase(iconPath: string): string {
  const normalized = iconPath.replace(/\\/g, "/");
  const encoded = encodeURI(
    normalized
      .replace(/\.dds$/i, ".png")
      .replace(/\.tex$/i, ".png")
      .replace(/\.jpg$/i, ".png")
      .replace(/\.jpeg$/i, ".png")
      .toLowerCase(),
  );
  if (encoded.startsWith("/lol-game-data/assets")) {
    return `${CDRAGON_GAME_DATA_BASE}${encoded.replace("/lol-game-data/assets", "")}`;
  }
  if (encoded.startsWith("/")) {
    return `${CDRAGON_GAME_DATA_BASE}${encoded}`;
  }
  return `${CDRAGON_GAME_DATA_BASE}/${encoded}`;
}

type AugmentRarityVariant =
  | "default"
  | "prismatic"
  | "gold"
  | "silver"
  | "bronze";

function rarityVariant(
  rarity: string | null | undefined,
): AugmentRarityVariant {
  switch (rarity) {
    case "kPrismatic":
      return "prismatic";
    case "kGold":
      return "gold";
    case "kSilver":
      return "silver";
    case "kBronze":
      return "bronze";
    default:
      return "default";
  }
}

export function MatchCardAugments({
  augmentIds,
}: {
  augmentIds: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];
}) {
  const { byId } = useCdragonCherryAugments();

  const slots = useMemo(() => {
    return AUGMENT_SLOT_KEYS.map((slotKey, slotIndex) => ({
      slotKey,
      id: augmentIds[slotIndex],
    }));
  }, [augmentIds]);

  if (!slots.some((slot) => slot.id != null && slot.id > 0)) {
    return null;
  }

  return (
    <div className={s.augmentGrid}>
      {slots.map(({ slotKey, id }) => {
        if (id == null || id <= 0) {
          return (
            <span
              key={`augment-empty-${slotKey}`}
              className={s.augmentEmptySlot}
              aria-hidden="true"
            />
          );
        }

        const augment = byId[id];
        const rarity = rarityVariant(augment?.rarity);
        const name = augment?.nameTRA?.trim() || `Augment #${id}`;
        const iconSrc = augment?.augmentSmallIconPath
          ? normalizeAugmentIconPath(augment.augmentSmallIconPath)
          : null;
        const fallbackIconSrc = augment?.augmentSmallIconPath
          ? normalizeAugmentIconPathLowercase(augment.augmentSmallIconPath)
          : null;

        return (
          <HoverCard.Root
            key={`augment-${slotKey}-${id}`}
            openDelay={100}
            closeDelay={60}
          >
            <HoverCard.Trigger asChild>
              <span className={s.augmentHoverTrigger}>
                <MatchCardAssetIcon
                  src={iconSrc}
                  fallbacks={[fallbackIconSrc]}
                  alt="Hextech augment"
                  className={s.augmentIcon({ rarity })}
                  fallbackClassName={s.augmentIconFallback({
                    rarity,
                  })}
                />
              </span>
            </HoverCard.Trigger>
            <Portal>
              <HoverCard.Positioner className={s.augmentHoverPositioner}>
                <HoverCard.Content className={s.augmentHoverContent}>
                  {name}
                </HoverCard.Content>
              </HoverCard.Positioner>
            </Portal>
          </HoverCard.Root>
        );
      })}
    </div>
  );
}
