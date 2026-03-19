import { useTranslation } from "react-i18next";
import { useDragonStaticData } from "../hooks/use-dragon-static-data";
import * as s from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";

export function MatchCardSpells({
  spell1Id,
  spell2Id,
}: {
  spell1Id: number;
  spell2Id: number;
}) {
  const { t } = useTranslation();
  const [spell1, spell2] = useDragonStaticData([
    { type: "spell", spellId: spell1Id },
    { type: "spell", spellId: spell2Id },
  ]);

  const spell1Alt =
    spell1.label ??
    t("history.match.unknownSpell", {
      id: spell1Id,
      defaultValue: `Spell ${spell1Id}`,
    });
  const spell2Alt =
    spell2.label ??
    t("history.match.unknownSpell", {
      id: spell2Id,
      defaultValue: `Spell ${spell2Id}`,
    });

  return (
    <div className={s.loadoutGroup}>
      <MatchCardAssetIcon
        src={spell1.src}
        alt={spell1Alt}
        className={s.assetIcon}
        fallbackClassName={s.assetIconFallback}
      />
      <MatchCardAssetIcon
        src={spell2.src}
        alt={spell2Alt}
        className={s.assetIcon}
        fallbackClassName={s.assetIconFallback}
      />
    </div>
  );
}
