/** @jsxImportSource solid-js */
import { HoverCard } from "@ark-ui/solid/hover-card";
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useSolidCdragonCherryAugments } from "../../hooks/use-cdragon-cherry-augments";
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

export function MatchCardAugments(props: {
  augmentIds: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];
}): JSX.Element {
  const { byId } = useSolidCdragonCherryAugments();
  const slots = createMemo(() =>
    AUGMENT_SLOT_KEYS.map((slotKey, slotIndex) => ({
      slotKey,
      id: props.augmentIds[slotIndex],
    })),
  );
  const hasAugments = createMemo(() =>
    slots().some((slot) => slot.id != null && slot.id > 0),
  );
  const augmentSlots = keyArray(
    slots,
    (slot) => slot.slotKey,
    (slot) => {
      const hasAugment = () => {
        const id = slot().id;
        return id != null && id > 0;
      };

      return (
        <Show
          when={hasAugment()}
          fallback={<span class={s.augmentEmptySlot} aria-hidden="true" />}
        >
          <HoverCard.Root openDelay={100} closeDelay={60}>
            <HoverCard.Trigger
              asChild={(getTriggerProps) => {
                const augment = () => byId()[slot().id ?? 0];
                const rarity = () => rarityVariant(augment()?.rarity);
                const iconSrc = () =>
                  augment()?.augmentSmallIconPath
                    ? normalizeAugmentIconPath(
                        augment()?.augmentSmallIconPath ?? "",
                      )
                    : null;
                const fallbackIconSrc = () =>
                  augment()?.augmentSmallIconPath
                    ? normalizeAugmentIconPathLowercase(
                        augment()?.augmentSmallIconPath ?? "",
                      )
                    : null;

                return (
                  <span
                    {...getTriggerProps({
                      class: s.augmentHoverTrigger,
                    })}
                  >
                    <MatchCardAssetIcon
                      src={iconSrc()}
                      fallbacks={[fallbackIconSrc()]}
                      alt="Hextech augment"
                      className={s.augmentIcon({ rarity: rarity() })}
                      fallbackClassName={s.augmentIconFallback({
                        rarity: rarity(),
                      })}
                    />
                  </span>
                );
              }}
            />
            <Portal>
              <HoverCard.Positioner class={s.augmentHoverPositioner}>
                <HoverCard.Content class={s.augmentHoverContent}>
                  {byId()[slot().id ?? 0]?.nameTRA?.trim() ||
                    `Augment #${slot().id}`}
                </HoverCard.Content>
              </HoverCard.Positioner>
            </Portal>
          </HoverCard.Root>
        </Show>
      );
    },
  );

  return (
    <Show when={hasAugments()}>
      <div class={s.augmentGrid}>{augmentSlots()}</div>
    </Show>
  );
}
