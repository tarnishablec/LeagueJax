/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { useSolidTranslation } from "@/i18n/solid";
import { useSolidSettingsPages } from "../components/SettingsHub";
import * as s from "../components/SettingsHub.css.ts";
import { resolveActivePage } from "../components/SettingsHub.utils";
import { SettingsSections } from "../components/SettingsSections";

export function SettingsIndexRoute(): JSX.Element {
  const { t } = useSolidTranslation();
  const pages = useSolidSettingsPages();
  const activePage = () => resolveActivePage(pages());

  return (
    <Show
      when={activePage()}
      fallback={<h1 class={s.title}>{t("settings.title")}</h1>}
    >
      {(page) => <SettingsSections page={page()} />}
    </Show>
  );
}

export default SettingsIndexRoute;
