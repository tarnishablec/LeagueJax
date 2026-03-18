import { useTranslation } from "react-i18next";
import { pageTitle } from "@/styles/shared.css";

export function ToolsRoute() {
  const { t } = useTranslation();
  return <div className={pageTitle}>{t("nav.tools")}</div>;
}
