/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { createMemo, For } from "solid-js";
import { useSolidCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";

const ITEM_SLOT_KEYS = [
  "item0",
  "item1",
  "item2",
  "item3",
  "item4",
  "item5",
  "item6",
] as const;

export function MatchCardItems(props: {
  gameId: number;
  items: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];
}): JSX.Element {
  const { t } = useSolidTranslation();
  const itemParams = createMemo(() =>
    props.items.map((itemId) => ({ type: "item" as const, itemId })),
  );
  const itemAssets = useSolidCdragonStaticData(itemParams());

  return (
    <div class={s.loadoutGroup}>
      <div class={s.itemsGrid}>
        <For each={ITEM_SLOT_KEYS}>
          {(_, slotIndex) => {
            const itemId = () => props.items[slotIndex()] ?? 0;
            const itemAsset = () => itemAssets()[slotIndex()];
            return (
              <MatchCardAssetIcon
                src={itemAsset()?.src ?? null}
                alt={t("history.match.itemAlt", {
                  id: itemId(),
                  defaultValue: `Item ${itemId()}`,
                })}
                className={s.itemIcon}
                fallbackClassName={s.itemIconFallback}
              />
            );
          }}
        </For>
      </div>
    </div>
  );
}
