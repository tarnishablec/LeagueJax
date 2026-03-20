import { useTranslation } from "react-i18next";
import { useDragonStaticData } from "@/hooks/use-dragon-static-data";
import * as s from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";

export function MatchCardRunes({
  perkPrimaryRuneId,
  perkSubStyleId,
}: {
  perkPrimaryRuneId: number;
  perkSubStyleId: number;
}) {
  const { t } = useTranslation();
  const [primaryRune, subStyle] = useDragonStaticData([
    { type: "rune", runeId: perkPrimaryRuneId },
    { type: "rune-style", styleId: perkSubStyleId },
  ]);

  return (
    <div className={s.loadoutGroup}>
      <MatchCardAssetIcon
        src={primaryRune.src}
        alt={t("history.match.primaryRune", {
          defaultValue: "Primary rune",
        })}
        className={s.assetIcon}
        fallbackClassName={s.assetIconFallback}
      />
      <MatchCardAssetIcon
        src={subStyle.src}
        alt={t("history.match.secondaryRuneStyle", {
          defaultValue: "Secondary rune style",
        })}
        className={s.subRuneStyleIcon}
        fallbackClassName={s.assetIconFallback}
      />
    </div>
  );
}
