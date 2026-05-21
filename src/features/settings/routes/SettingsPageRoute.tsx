/** @jsxImportSource solid-js */
import { Navigate, useParams } from "@solidjs/router";
import type { JSX } from "solid-js";
import { lazy, Show } from "solid-js";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import { useSolidTranslation } from "@/i18n/solid";
import { SettingsClientArgsView } from "../components/SettingsClientArgsView";
import { useSolidSettingsPages } from "../components/SettingsHub";
import * as s from "../components/SettingsHub.css.ts";
import { resolveActivePage } from "../components/SettingsHub.utils";
import { SettingsRegistryList } from "../components/SettingsRegistryList";
import { SettingsSections } from "../components/SettingsSections";

const ShardsPage = lazy(() => import("./ShardsPage"));
const AboutPage = lazy(() => import("./AboutPage"));

export function SettingsPageRoute(): JSX.Element {
  const settings = useSolidSettings();
  const { t } = useSolidTranslation();
  const pages = useSolidSettingsPages();
  const params = useParams();
  const pageId = () => params.pageId;
  const activePage = () => resolveActivePage(pages(), pageId());

  return (
    <Show
      when={pageId() !== "client-args"}
      fallback={<SettingsClientArgsView />}
    >
      <Show
        when={pageId() !== "registry"}
        fallback={
          <SettingsRegistryList definitions={settings.listDefinitions()} />
        }
      >
        <Show when={pageId() !== "shards"} fallback={<ShardsPage />}>
          <Show when={pageId() !== "about"} fallback={<AboutPage />}>
            <Show
              when={pages().length > 0}
              fallback={<h1 class={s.title}>{t("settings.title")}</h1>}
            >
              <Show
                when={activePage()}
                fallback={
                  <Navigate href={`/main/settings/${pages()[0]?.id}`} />
                }
              >
                {(page) => <SettingsSections page={page()} />}
              </Show>
            </Show>
          </Show>
        </Show>
      </Show>
    </Show>
  );
}

export default SettingsPageRoute;
