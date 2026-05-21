/** @jsxImportSource solid-js */
import { Construction } from "lucide-solid";
import type { JSX } from "solid-js";
import { useSolidTranslation } from "@/i18n/solid";
import { IconTitleSubtitleState } from "./IconTitleSubtitleState";

export function WipPlaceholder(): JSX.Element {
  const { t } = useSolidTranslation();

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
