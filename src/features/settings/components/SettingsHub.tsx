import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router";
import { settingsApi } from "../store";
import * as s from "./SettingsHub.css";
import { buildSettingsPages, resolveActivePage } from "./SettingsHub.utils";
import { SettingsPageTabs } from "./SettingsPageTabs";
import { SettingsSections } from "./SettingsSections";

export function SettingsHub() {
  const { t } = useTranslation();
  const { pageId } = useParams();

  const pages = useMemo(() => {
    return buildSettingsPages(settingsApi.listDefinitions());
  }, []);

  if (pages.length === 0) {
    return (
      <div className={s.page}>
        <h1 className={s.title}>{t("settings.title")}</h1>
      </div>
    );
  }

  const activePage = resolveActivePage(pages, pageId);
  if (!activePage) {
    return <Navigate to={`/settings/${pages[0].id}`} replace />;
  }

  return (
    <div className={s.page}>
      {/*<h1 className={s.title}>{t("settings.title")}</h1>*/}
      <SettingsPageTabs pages={pages} />
      <SettingsSections page={activePage} />
    </div>
  );
}
