/** @jsxImportSource solid-js */

import { Key } from "@solid-primitives/keyed";
import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import type { JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import type { UpdaterStateDto } from "@/bindings/updater";
import {
  SettingsActionButton,
  SettingsFieldRow,
} from "@/components/settings-ui";
import type { SettingsHintTone } from "@/components/settings-ui/SettingsHint";
import type { SettingsSectionRendererProps } from "@/features/settings/types";
import { useSolidTranslation } from "@/i18n/solid";
import { createLogger } from "@/infra/logger";
import { SettingsFieldRenderer } from "../../settings/components/SettingsFieldRenderer";
import * as s from "./UpdaterSettingsSection.css";

const logger = createLogger("solid-updater-settings");

const initialState: UpdaterStateDto = {
  kind: "idle",
  currentVersion: "",
  latestVersion: null,
  notes: null,
  source: null,
  message: null,
};

export function UpdaterSettingsSection(
  props: SettingsSectionRendererProps,
): JSX.Element {
  const { t } = useSolidTranslation();
  const [state, setState] = createSignal<UpdaterStateDto>(initialState);
  const [showTransientUpToDate, setShowTransientUpToDate] = createSignal(false);
  const [shouldAnimateUpToDate, setShouldAnimateUpToDate] = createSignal(false);
  const busy = createMemo(() => {
    const kind = state().kind;
    return kind === "checking" || kind === "installing";
  });
  const showUpToDateState = createMemo(
    () => state().kind === "upToDate" && showTransientUpToDate(),
  );
  const latestVersionHint = createMemo(() => {
    const current = state();
    if (current.kind === "error") {
      return current.message ?? undefined;
    }

    if (current.kind === "updateAvailable" || current.kind === "installing") {
      return current.notes ?? undefined;
    }

    return undefined;
  });
  const latestVersionHintTone = createMemo<SettingsHintTone>(() => {
    const kind = state().kind;
    if (kind === "error") {
      return "error";
    }

    if (kind === "updateAvailable" || kind === "installing") {
      return "warning";
    }

    return "info";
  });
  const actionLabel = createMemo(() => {
    const current = state();
    if (current.kind === "updateAvailable" || current.kind === "installing") {
      return current.latestVersion ?? t("settings.update.action.install");
    }

    if (showUpToDateState()) {
      return t("settings.update.action.upToDate");
    }

    return t("settings.update.action.check");
  });
  const actionTone = createMemo(() => {
    const kind = state().kind;
    return kind === "updateAvailable" || kind === "installing"
      ? "accent"
      : "neutral";
  });

  let resetUpToDateTimer: number | null = null;

  createEffect(() => {
    if (resetUpToDateTimer !== null) {
      window.clearTimeout(resetUpToDateTimer);
      resetUpToDateTimer = null;
    }

    if (state().kind !== "upToDate" || !shouldAnimateUpToDate()) {
      setShowTransientUpToDate(false);
      return;
    }

    setShowTransientUpToDate(true);

    resetUpToDateTimer = window.setTimeout(() => {
      setShowTransientUpToDate(false);
      setShouldAnimateUpToDate(false);
      resetUpToDateTimer = null;
    }, 1500);
  });

  onCleanup(() => {
    if (resetUpToDateTimer !== null) {
      window.clearTimeout(resetUpToDateTimer);
    }
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
    setShouldAnimateUpToDate(true);
    const next = await invoke<UpdaterStateDto>("run_updater_action");
    setState(next);
  };

  return (
    <div class={s.root}>
      <Key each={props.fields} by="id">
        {(field) => <SettingsFieldRenderer field={field()} />}
      </Key>

      <SettingsFieldRow
        label={t("settings.update.summary.currentVersion")}
        controlAlign="stretch"
      >
        <span class={s.valueText}>{state().currentVersion || "-"}</span>
      </SettingsFieldRow>
      <SettingsFieldRow
        label={t("settings.update.summary.latestVersion")}
        hint={latestVersionHint()}
        hintTone={latestVersionHintTone()}
        controlAlign="stretch"
      >
        <SettingsActionButton
          ariaLabel="Run updater action"
          label={actionLabel()}
          loading={busy()}
          disabled={busy()}
          tone={actionTone()}
          onClick={runAction}
          onError={(error) => {
            logger.error({ error }, "Updater action failed");
          }}
        />
      </SettingsFieldRow>
    </div>
  );
}
