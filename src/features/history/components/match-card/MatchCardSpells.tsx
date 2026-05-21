/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { useSolidCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";

export function MatchCardSpells(props: {
  spell1Id: number;
  spell2Id: number;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const spells = useSolidCdragonStaticData([
    { type: "spell", spellId: props.spell1Id },
    { type: "spell", spellId: props.spell2Id },
  ]);
  const spell1 = () => spells()[0];
  const spell2 = () => spells()[1];
  const spell1Alt = () =>
    spell1()?.label ??
    t("history.match.unknownSpell", {
      id: props.spell1Id,
      defaultValue: `Spell ${props.spell1Id}`,
    });
  const spell2Alt = () =>
    spell2()?.label ??
    t("history.match.unknownSpell", {
      id: props.spell2Id,
      defaultValue: `Spell ${props.spell2Id}`,
    });

  return (
    <div class={s.loadoutGroup}>
      <MatchCardAssetIcon
        src={spell1()?.src}
        alt={spell1Alt()}
        className={s.assetIcon}
        fallbackClassName={s.assetIconFallback}
      />
      <MatchCardAssetIcon
        src={spell2()?.src}
        alt={spell2Alt()}
        className={s.assetIcon}
        fallbackClassName={s.assetIconFallback}
      />
    </div>
  );
}
