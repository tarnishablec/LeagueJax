import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconTitleSubtitleState } from "./IconTitleSubtitleState";

export function WipPlaceholder() {
  const { t } = useTranslation();

  return (
    <IconTitleSubtitleState
      icon={Construction}
      title={t("common.wipTitle", { defaultValue: "WIP" })}
      titleWeight={700}
      subtitle={t("common.wipSubtitle", {
        defaultValue: "Under Construction",
      })}
    />
  );
}
