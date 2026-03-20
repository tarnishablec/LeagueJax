import { useTranslation } from "react-i18next";
import { Navigate, useOutletContext } from "react-router";
import type { SettingsOutletContext } from "../components/SettingsHub";
import * as s from "../components/SettingsHub.css";

export function SettingsIndexRoute() {
  const { t } = useTranslation();
  const { pages } = useOutletContext<SettingsOutletContext>();

  if (pages.length === 0) {
    return <h1 className={s.title}>{t("settings.title")}</h1>;
  }

  return <Navigate to={`/settings/${pages[0].id}`} replace />;
}
