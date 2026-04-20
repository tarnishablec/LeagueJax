import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UpdaterStateDto } from "@/bindings/updater";
import {
  SettingsActionButton,
  SettingsFieldRow,
  SettingsValueText,
} from "@/components/settings-ui";
import { SettingsFieldRenderer } from "@/features/settings/components/SettingsFieldRenderer";
import type { SettingsSectionRendererProps } from "@/features/settings/types";
import { createLogger } from "@/infra/logger";
import * as s from "./UpdaterSettingsSection.css";

const logger = createLogger("updater-settings-section");

const initialState: UpdaterStateDto = {
  kind: "idle",
  currentVersion: "",
  latestVersion: null,
  notes: null,
  source: null,
  message: null,
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This component is inherently complex due to the various states and UI conditions it needs to handle. Refactoring it into smaller components would not necessarily improve readability or maintainability.
export function UpdaterSettingsSection({
  fields,
}: SettingsSectionRendererProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<UpdaterStateDto>(initialState);
  const latestVersionHint =
    state.kind === "error"
      ? (state.message ?? undefined)
      : state.kind === "updateAvailable" || state.kind === "installing"
        ? (state.notes ?? undefined)
        : undefined;
  const latestVersionHintTone =
    state.kind === "error"
      ? "error"
      : state.kind === "updateAvailable" || state.kind === "installing"
        ? "warning"
        : "info";

  const actionLabel =
    state.kind === "updateAvailable" || state.kind === "installing"
      ? (state.latestVersion ?? t("settings.update.action.install"))
      : state.kind === "upToDate"
        ? t("settings.update.action.upToDate")
        : t("settings.update.action.check");

  const actionTone =
    state.kind === "updateAvailable" || state.kind === "installing"
      ? "accent"
      : "neutral";

  const actionLoading =
    state.kind === "checking" || state.kind === "installing";

  const actionDisabled = actionLoading || state.kind === "upToDate";

  useEffect(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      try {
        const snapshot = await invoke<UpdaterStateDto>("get_updater_state");
        if (!cancelled) {
          setState(snapshot);
        }

        unlisten = await listen<UpdaterStateDto>(
          "updater_state_changed",
          (event) => {
            setState(event.payload);
          },
        );
      } catch (error) {
        logger.error({ error }, "Failed to initialize updater settings state");
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (unlisten) {
        void unlisten();
      }
    };
  }, []);

  return (
    <div className={s.root}>
      {fields.map((field) => (
        <SettingsFieldRenderer key={field.id} field={field} />
      ))}

      <SettingsFieldRow
        label={t("settings.update.summary.currentVersion")}
        scopeTag="rs"
      >
        <SettingsValueText value={state.currentVersion || "-"} />
      </SettingsFieldRow>

      <SettingsFieldRow
        label={t("settings.update.summary.latestVersion")}
        hint={latestVersionHint}
        hintTone={latestVersionHintTone}
        scopeTag="rs"
      >
        <SettingsActionButton
          ariaLabel="Run updater action"
          disabled={actionDisabled}
          label={actionLabel}
          loading={actionLoading}
          tone={actionTone}
          onClick={async () => {
            const next = await invoke<UpdaterStateDto>("run_updater_action");
            setState(next);
          }}
          onError={(error) => {
            logger.error({ error }, "Updater action failed");
          }}
        />
      </SettingsFieldRow>
    </div>
  );
}
