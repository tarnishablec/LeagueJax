import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import type { SettingsOutletContext } from "../components/SettingsHub";
import * as s from "../components/SettingsHub.css";
import { resolveActivePage } from "../components/SettingsHub.utils";
import { SettingsSections } from "../components/SettingsSections";

export function SettingsIndexRoute() {
  const { t } = useTranslation();
  const { pages } = useOutletContext<SettingsOutletContext>();
  const activePage = resolveActivePage(pages);

  if (!activePage) {
    return <h1 className={s.title}>{t("settings.title")}</h1>;
  }

  return <SettingsSections page={activePage} />;
}
