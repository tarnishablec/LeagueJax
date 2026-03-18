import { useTranslation } from "react-i18next";
import { pageTitle } from "../styles/shared.css";

export function Automation() {
  const { t } = useTranslation();
  return <div className={pageTitle}>{t("nav.automation")}</div>;
}
