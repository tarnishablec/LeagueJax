import { useTranslation } from "react-i18next";
import { Navigate, useOutletContext, useParams } from "react-router";
import { useSettings } from "@/features/settings/context";
import { SettingsClientArgsView } from "../components/SettingsClientArgsView";
import type { SettingsOutletContext } from "../components/SettingsHub";
import * as s from "../components/SettingsHub.css";
import { resolveActivePage } from "../components/SettingsHub.utils";
import { SettingsRegistryList } from "../components/SettingsRegistryList";
import { SettingsSections } from "../components/SettingsSections";

export function SettingsPageRoute() {
  const settings = useSettings();
  const { t } = useTranslation();
  const { pages } = useOutletContext<SettingsOutletContext>();
  const { pageId } = useParams();

  if (pageId === "client-args") {
    return <SettingsClientArgsView />;
  }

  if (pageId === "registry") {
    return <SettingsRegistryList definitions={settings.listDefinitions()} />;
  }

  const activePage = resolveActivePage(pages, pageId);
  if (pages.length === 0) {
    return <h1 className={s.title}>{t("settings.title")}</h1>;
  }

  if (!activePage) {
    return <Navigate to={`/settings/${pages[0].id}`} replace />;
  }

  return <SettingsSections page={activePage} />;
}
