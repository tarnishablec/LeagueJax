import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useOutletContext, useParams } from "react-router";
import { ScrollArea } from "@/components/scroll-area";
import { useSettings } from "@/features/settings/context";
import { SettingsClientArgsView } from "../components/SettingsClientArgsView";
import type { SettingsOutletContext } from "../components/SettingsHub";
import * as s from "../components/SettingsHub.css";
import { resolveActivePage } from "../components/SettingsHub.utils";
import { SettingsRegistryList } from "../components/SettingsRegistryList";
import { SettingsSections } from "../components/SettingsSections";
import { AboutPage } from "./AboutPage";
import { ShardsPage } from "./ShardsPage";

function SettingsPageScroller({ children }: { children: ReactNode }) {
  return (
    <ScrollArea
      className={s.pageScroller}
      contentClassName={s.pageScrollerContent}
    >
      {children}
    </ScrollArea>
  );
}

export function SettingsPageRoute() {
  const settings = useSettings();
  const { t } = useTranslation();
  const { pages } = useOutletContext<SettingsOutletContext>();
  const { pageId } = useParams();

  if (pageId === "client-args") {
    return (
      <SettingsPageScroller>
        <SettingsClientArgsView />
      </SettingsPageScroller>
    );
  }

  if (pageId === "registry") {
    return (
      <SettingsPageScroller>
        <SettingsRegistryList definitions={settings.listDefinitions()} />
      </SettingsPageScroller>
    );
  }

  if (pageId === "shards") {
    return <ShardsPage />;
  }

  if (pageId === "about") {
    return (
      <SettingsPageScroller>
        <AboutPage />
      </SettingsPageScroller>
    );
  }

  const activePage = resolveActivePage(pages, pageId);
  if (pages.length === 0) {
    return <h1 className={s.title}>{t("settings.title")}</h1>;
  }

  if (!activePage) {
    return <Navigate to={`/main/settings/${pages[0].id}`} replace />;
  }

  return (
    <SettingsPageScroller>
      <SettingsSections page={activePage} />
    </SettingsPageScroller>
  );
}
