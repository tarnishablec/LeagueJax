import { Tabs } from "@ark-ui/react/tabs";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import * as s from "./SettingsHub.css";
import type { PageEntry } from "./settings-view-model";

interface SettingsPageTabsProps {
  pages: PageEntry[];
}

const utilityPages = [
  {
    id: "client-args",
    to: "/main/settings/client-args",
    labelKey: "settings.clientArgs.tab",
    defaultValue: "Client Args",
  },
  {
    id: "registry",
    to: "/main/settings/registry",
    labelKey: "settings.registry.tab",
    defaultValue: "Registry",
  },
  {
    id: "shards",
    to: "/main/settings/shards",
    labelKey: "settings.shards.tab",
    defaultValue: "Shards",
  },
  {
    id: "about",
    to: "/main/settings/about",
    labelKey: "settings.pages.about.title",
    defaultValue: "About",
  },
] as const;

export function SettingsPageTabs({ pages }: SettingsPageTabsProps) {
  const { t } = useTranslation();
  const { pageId } = useParams();
  const activePrimaryPageId =
    pageId && pages.some((page) => page.id === pageId) ? pageId : null;
  const activeUtilityPageId =
    pageId && utilityPages.some((page) => page.id === pageId) ? pageId : null;

  return (
    <div className={s.pageTabs}>
      <Tabs.Root
        className={s.primaryTabsRoot}
        value={activePrimaryPageId}
        activationMode="manual"
      >
        <Tabs.List
          className={s.primaryTabsList}
          data-scrollbar="hidden"
          aria-label="Settings pages"
        >
          {pages.map((page) => (
            <Tabs.Trigger
              key={page.id}
              value={page.id}
              asChild
              className={s.primaryTab}
            >
              <Link to={`/main/settings/${page.id}`}>
                {t(`settings.pages.${page.id}.title`, {
                  defaultValue: page.id,
                })}
              </Link>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      <Tabs.Root
        className={s.utilityTabsRoot}
        value={activeUtilityPageId}
        activationMode="manual"
      >
        <Tabs.List
          className={s.utilityTabsList}
          data-scrollbar="hidden"
          aria-label="Settings utility pages"
        >
          {utilityPages.map((page) => (
            <Tabs.Trigger
              key={page.id}
              value={page.id}
              asChild
              className={s.primaryTab}
            >
              <Link to={page.to}>
                {t(page.labelKey, { defaultValue: page.defaultValue })}
              </Link>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
}
