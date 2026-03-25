import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as s from "./WipPlaceholder.css";

export function WipPlaceholder() {
  const { t } = useTranslation();

  return (
    <div className={s.root}>
      <Construction className={s.icon} aria-hidden="true" />
      <div className={s.title}>
        {t("common.wipTitle", { defaultValue: "WIP" })}
      </div>
      <div className={s.subtitle}>
        {t("common.wipSubtitle", { defaultValue: "Under Construction" })}
      </div>
    </div>
  );
}
