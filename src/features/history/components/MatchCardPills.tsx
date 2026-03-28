import { useTranslation } from "react-i18next";
import type { MatchTag } from "../hooks/use-match-card-view-model";
import * as s from "./MatchCard.css";

const TAG_I18N_KEYS: Record<MatchTag, string> = {
  penta: "history.tag.penta",
  quadra: "history.tag.quadra",
  triple: "history.tag.triple",
  firstBlood: "history.tag.firstBlood",
  highestDamage: "history.tag.highestDamage",
  mvp: "history.tag.mvp",
};

export function MatchCardPills({ tags }: { tags: MatchTag[] }) {
  const { t } = useTranslation();

  if (tags.length === 0) return null;

  return (
    <div className={s.pillsRow}>
      {tags.map((tag) => (
        <span key={tag} className={s.tagPill({ tag })}>
          {t(TAG_I18N_KEYS[tag])}
        </span>
      ))}
    </div>
  );
}
