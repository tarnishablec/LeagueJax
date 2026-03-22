import { useMemo } from "react";
import { Outlet } from "react-router";
import { useSettings } from "@/features/settings/context";
import * as s from "./SettingsHub.css";
import { buildSettingsPages } from "./SettingsHub.utils";
import { SettingsPageTabs } from "./SettingsPageTabs";
import type { PageEntry } from "./settings-view-model";

export interface SettingsOutletContext {
  pages: PageEntry[];
}

export function SettingsHub() {
  const settings = useSettings();
  const pages = useMemo(() => {
    return buildSettingsPages(settings.listDefinitions());
  }, [settings]);
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
