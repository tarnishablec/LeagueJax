/** @jsxImportSource solid-js */

import { Key } from "@solid-primitives/keyed";
import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import type { JSX } from "solid-js";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { UpdaterStateDto } from "@/bindings/updater";
import {
  SettingsActionButton,
  SettingsFieldRow,
} from "@/components/settings-ui";
import type { SettingsSectionRendererProps } from "@/features/settings/types";
import { useSolidTranslation } from "@/i18n/solid";
import { createLogger } from "@/infra/logger";
import { SettingsFieldRenderer } from "../../settings/components/SettingsFieldRenderer";
import * as s from "./UpdaterSettingsSection.css";

const logger = createLogger("solid-updater-settings");

function actionLabel(
  kind: UpdaterStateDto["kind"] | undefined,
  t: (key: string) => string,
) {
  if (kind === "updateAvailable") {
    return t("settings.update.action.install");
  }
  return t("settings.update.action.check");
}

export function UpdaterSettingsSection(
  props: SettingsSectionRendererProps,
): JSX.Element {
  const { t } = useSolidTranslation();
  const [state, setState] = createSignal<UpdaterStateDto | null>(null);
  const busy = createMemo(() => {
    const kind = state()?.kind;
    return kind === "checking" || kind === "installing";
  });

  onMount(() => {
    let disposed = false;
    let unlisten: Promise<UnlistenFn> | null = null;

    const hydrate = async () => {
      try {
        const next = await invoke<UpdaterStateDto>("get_updater_state");
        if (!disposed) {
          setState(next);
        }
      } catch (error) {
        logger.error({ error }, "Failed to load updater state");
      }
    };

    void hydrate();
    unlisten = listen<UpdaterStateDto>("updater_state_changed", (event) => {
      setState(event.payload);
    });

    onCleanup(() => {
      disposed = true;
      unlisten?.then((dispose) => dispose()).catch(() => {});
    });
  });

  const runAction = async () => {
    try {
      const next = await invoke<UpdaterStateDto>("run_updater_action");
      setState(next);
    } catch (error) {
      logger.error({ error }, "Updater action failed");
    }
  };

  return (
    <div class={s.root}>
      <Key each={props.fields} by="id">
        {(field) => <SettingsFieldRenderer field={field()} />}
      </Key>

      <div class={s.summaryGrid}>
        <SettingsFieldRow
          label={t("settings.update.summary.currentVersion")}
          controlAlign="stretch"
        >
          <span class={s.valueText}>{state()?.currentVersion || "-"}</span>
        </SettingsFieldRow>
        <SettingsFieldRow
          label={t("settings.update.action.label")}
          hint={t("settings.update.action.hint")}
          controlAlign="stretch"
        >
          <SettingsActionButton
            ariaLabel="Run updater action"
            label={actionLabel(state()?.kind, t)}
            loading={busy()}
            disabled={busy()}
            onClick={runAction}
          />
        </SettingsFieldRow>
      </div>
    </div>
  );
}
