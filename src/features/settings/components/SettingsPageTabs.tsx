/** @jsxImportSource solid-js */

import { Tabs } from "@ark-ui/solid/tabs";
import { keyArray } from "@solid-primitives/keyed";
import { A, useParams } from "@solidjs/router";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./SettingsHub.css.ts";
import { resolveActivePage } from "./SettingsHub.utils";
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

export function SettingsPageTabs(props: SettingsPageTabsProps): JSX.Element {
  const { t } = useSolidTranslation();
  const params = useParams();
  const pageId = () => params.pageId;
  const activePrimaryPageId = createMemo(
    () => resolveActivePage(props.pages, pageId())?.id ?? null,
  );
  const activeUtilityPageId = createMemo(() =>
    pageId() && utilityPages.some((page) => page.id === pageId())
      ? pageId()
      : null,
  );
  const primaryTabs = keyArray(
    () => props.pages,
    (page) => page.id,
    (page) => (
      <Tabs.Trigger
        value={page().id}
        asChild={(getTriggerProps) => (
          <A
            {...getTriggerProps({
              class: s.primaryTab,
            })}
            href={`/main/settings/${page().id}`}
          >
            {t(`settings.pages.${page().id}.title`, {
              defaultValue: page().id,
            })}
          </A>
        )}
      />
    ),
  );
  const utilityTabs = keyArray(
    () => utilityPages,
    (page) => page.id,
    (page) => (
      <Tabs.Trigger
        value={page().id}
        asChild={(getTriggerProps) => (
          <A
            {...getTriggerProps({
              class: s.primaryTab,
            })}
            href={page().to}
          >
            {t(page().labelKey, { defaultValue: page().defaultValue })}
          </A>
        )}
      />
    ),
  );

  return (
    <div class={s.pageTabs}>
      <Tabs.Root
        class={s.primaryTabsRoot}
        value={activePrimaryPageId()}
        activationMode="manual"
      >
        <Tabs.List
          class={s.primaryTabsList}
          data-scrollbar="hidden"
          aria-label="Settings pages"
        >
          {primaryTabs()}
        </Tabs.List>
      </Tabs.Root>

      <Tabs.Root
        class={s.utilityTabsRoot}
        value={activeUtilityPageId()}
        activationMode="manual"
      >
        <Tabs.List
          class={s.utilityTabsList}
          data-scrollbar="hidden"
          aria-label="Settings utility pages"
        >
          {utilityTabs()}
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
}
