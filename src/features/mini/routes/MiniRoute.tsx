import { MapPinned } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { LcuImage } from "@/components/LcuImage";
import {
  SettingsFieldRow,
  SettingsInput,
  SettingsToggle,
} from "@/components/settings-ui";
import { useSettings } from "@/features/settings/context";
import type { SettingId } from "@/features/settings/types";
import {
  type MiniWindowScene,
  useMiniWindowModel,
} from "../hooks/use-mini-window-model";
import * as s from "./MiniRoute.css";

const AUTO_ACCEPT_SETTING_ID =
  "matchmaking.interaction.autoAccept" satisfies SettingId;
const ACCEPT_DELAY_SECONDS_SETTING_ID =
  "matchmaking.interaction.acceptDelayMs" satisfies SettingId;

function sceneLabel(scene: MiniWindowScene): string {
  switch (scene) {
    case "matchmaking":
      return "Matchmaking";
    case "ongoing":
      return "Ongoing";
    case "idle":
      return "Idle";
  }
}

function useSettingValue<T>(id: SettingId): T | undefined {
  const settings = useSettings();
  return useSyncExternalStore(
    (onStoreChange) => settings.subscribe(id, onStoreChange),
    () => settings.get<T>(id),
    () => settings.get<T>(id),
  );
}

function MiniAutoAcceptSettings() {
  const settings = useSettings();
  const { t } = useTranslation();
  const autoAccept = useSettingValue<boolean>(AUTO_ACCEPT_SETTING_ID) ?? false;
  const acceptDelay =
    useSettingValue<number>(ACCEPT_DELAY_SECONDS_SETTING_ID) ?? 0;

  return (
    <>
      <SettingsFieldRow
        label={t("settings.matchmaking.autoAccept.label")}
        settingId={AUTO_ACCEPT_SETTING_ID}
      >
        <SettingsToggle
          ariaLabel="Setting matchmaking.interaction.autoAccept"
          checked={autoAccept}
          onCheckedChange={(checked) => {
            settings.set(AUTO_ACCEPT_SETTING_ID, checked);
          }}
        />
      </SettingsFieldRow>
      <SettingsFieldRow
        label={t("settings.matchmaking.acceptDelaySeconds.label")}
        settingId={ACCEPT_DELAY_SECONDS_SETTING_ID}
      >
        <SettingsInput
          ariaLabel="Setting matchmaking.interaction.acceptDelayMs"
          type="number"
          value={String(acceptDelay)}
          min={0}
          max={10}
          step={1}
          onValueChange={(next) => {
            if (next.trim() === "") {
              return;
            }

            const parsed = Number(next);
            if (!Number.isNaN(parsed)) {
              settings.set(ACCEPT_DELAY_SECONDS_SETTING_ID, parsed);
            }
          }}
        />
      </SettingsFieldRow>
    </>
  );
}

export function MiniRoute() {
  const model = useMiniWindowModel();

  return (
    <section className={s.root}>
      <div className={s.hero}>
        <div className={s.mapIconFrame}>
          {model.mapIconSrc ? (
            <LcuImage
              className={s.mapImage}
              src={model.mapIconSrc}
              alt="Map icon"
            />
          ) : (
            <MapPinned className={s.mapFallback} size={28} aria-hidden="true" />
          )}
        </div>

        <div className={s.meta}>
          <span className={s.scene}>{sceneLabel(model.scene)}</span>
          <strong className={s.mode}>{model.modeName}</strong>
          <span className={s.phase}>{model.phaseText}</span>
          {model.mapName ? (
            <span className={s.mapName}>{model.mapName}</span>
          ) : null}
        </div>
      </div>

      <footer className={s.footer}>
        <MiniAutoAcceptSettings />
      </footer>
    </section>
  );
}
