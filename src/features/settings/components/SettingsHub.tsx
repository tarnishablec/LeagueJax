import { useMemo } from "react";
import { Outlet } from "react-router";
import { settingsApi } from "../store";
import * as s from "./SettingsHub.css";
import { buildSettingsPages } from "./SettingsHub.utils";
import { SettingsPageTabs } from "./SettingsPageTabs";
import type { PageEntry } from "./settings-view-model";

export interface SettingsOutletContext {
  pages: PageEntry[];
}

export function SettingsHub() {
  const pages = useMemo(() => {
    return buildSettingsPages(settingsApi.listDefinitions());
  }, []);
  const outletContext: SettingsOutletContext = { pages };

  return (
    <div className={s.page}>
      <SettingsPageTabs pages={pages} />
      <div className={s.outlet}>
        <Outlet context={outletContext} />
      </div>
    </div>
  );
}
