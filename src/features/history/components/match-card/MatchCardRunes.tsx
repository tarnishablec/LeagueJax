/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { useSolidCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";

export function MatchCardRunes(props: {
  perkPrimaryRuneId: number;
  perkSubStyleId: number;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const runes = useSolidCdragonStaticData([
    { type: "rune", runeId: props.perkPrimaryRuneId },
    { type: "rune-style", styleId: props.perkSubStyleId },
  ]);
  const primaryRune = () => runes()[0];
  const subStyle = () => runes()[1];

  return (
    <div class={s.loadoutGroup}>
      <MatchCardAssetIcon
        src={primaryRune()?.src}
        alt={t("history.match.primaryRune", {
          defaultValue: "Primary rune",
        })}
        className={s.assetIcon}
        fallbackClassName={s.assetIconFallback}
      />
      <MatchCardAssetIcon
        src={subStyle()?.src}
        alt={t("history.match.secondaryRuneStyle", {
          defaultValue: "Secondary rune style",
        })}
        className={s.subRuneStyleIcon}
        fallbackClassName={s.assetIconFallback}
      />
    </div>
  );
}
