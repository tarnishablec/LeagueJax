import { useTranslation } from "react-i18next";
import { pageTitle } from "../styles/shared.css";

export function OngoingGame() {
  const { t } = useTranslation();
  return <div className={pageTitle}>{t("nav.game")}</div>;
}
