import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDragonStaticData } from "@/hooks/use-dragon-static-data";
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

export function MatchCardItems({
  gameId,
  items,
}: {
  gameId: number;
  items: [number, number, number, number, number, number, number];
}) {
  const { t } = useTranslation();
  const itemParams = useMemo(
    () => items.map((itemId) => ({ type: "item" as const, itemId })),
    [items],
  );
  const itemAssets = useDragonStaticData(itemParams);

  return (
    <div className={s.itemsGrid}>
      {ITEM_SLOT_KEYS.map((slotKey, slotIndex) => {
        const itemId = items[slotIndex] ?? 0;
        const itemAsset = itemAssets[slotIndex];
        return (
          <MatchCardAssetIcon
            key={`${gameId}-${slotKey}`}
            src={itemAsset?.src ?? null}
            alt={t("history.match.itemAlt", {
              id: itemId,
              defaultValue: `Item ${itemId}`,
            })}
            className={s.itemIcon}
            fallbackClassName={s.itemIconFallback}
          />
        );
      })}
    </div>
  );
}
