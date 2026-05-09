import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  SettingsFieldRow,
  SettingsInput,
  SettingsToggle,
} from "@/components/settings-ui";
import { useSettings } from "@/features/settings/context";
import type { SettingId } from "@/features/settings/types";
import type { MiniWindowModel } from "../hooks/use-mini-window-model";
import * as s from "./MiniBottomPanel.css";
import { MiniChampSelectDodgeSection } from "./MiniChampSelectDodgeSection";
import {
  type MiniBottomPanelKind,
  resolveMiniBottomPanelKind,
} from "./mini-bottom-panel-kind";

export type { MiniBottomPanelKind };
export { resolveMiniBottomPanelKind };

export const AUTO_ACCEPT_SETTING_ID =
  "ongoing.matchmaking.autoAccept" satisfies SettingId;
export const ACCEPT_DELAY_SECONDS_SETTING_ID =
  "ongoing.matchmaking.acceptDelayMs" satisfies SettingId;
const ACCEPT_DELAY_MIN_SECONDS = 0;
const ACCEPT_DELAY_MAX_SECONDS = 10;

interface ChampSelectDodgePanel {
  error?: string | null;
  pending: boolean;
  onDodge: () => void;
}

export function useMiniSettingValue<T>(id: SettingId): T | undefined {
  const settings = useSettings();
  return useSyncExternalStore(
    (onStoreChange) => settings.subscribe(id, onStoreChange),
    () => settings.get<T>(id),
    () => settings.get<T>(id),
  );
}

function shouldShowAutoAcceptCountdown(
  enabled: boolean,
  readyCheck: MiniWindowModel["readyCheck"],
): boolean {
  return (
    enabled &&
    readyCheck?.state === "InProgress" &&
    readyCheck.playerResponse === "None"
  );
}

export function useAutoAcceptCountdown(
  enabled: boolean,
  delaySeconds: number,
  readyCheck: MiniWindowModel["readyCheck"],
): number | null {
  const active = shouldShowAutoAcceptCountdown(enabled, readyCheck);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      setDeadline(null);
      return;
    }

    const current = Date.now();
    setNow(current);
    const normalizedDelay = Math.min(
      ACCEPT_DELAY_MAX_SECONDS,
      Math.max(ACCEPT_DELAY_MIN_SECONDS, delaySeconds),
    );
    setDeadline(current + normalizedDelay * 1000);
  }, [active, delaySeconds]);

  useEffect(() => {
    if (deadline == null) {
      return;
    }

    const tick = () => setNow(Date.now());
    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [deadline]);

  if (!active || deadline == null) {
    return null;
  }

  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function MiniAutoAcceptSettings() {
  const settings = useSettings();
  const { t } = useTranslation();
  const autoAccept =
    useMiniSettingValue<boolean>(AUTO_ACCEPT_SETTING_ID) ?? false;
  const acceptDelay =
    useMiniSettingValue<number>(ACCEPT_DELAY_SECONDS_SETTING_ID) ?? 0;

  return (
    <section className={s.autoAcceptPanel}>
      <SettingsFieldRow
        label={t("settings.ongoing.matchmaking.autoAccept.label")}
        settingId={AUTO_ACCEPT_SETTING_ID}
      >
        <SettingsToggle
          ariaLabel="Setting ongoing.matchmaking.autoAccept"
          checked={autoAccept}
          onCheckedChange={(checked) => {
            settings.set(AUTO_ACCEPT_SETTING_ID, checked);
          }}
        />
      </SettingsFieldRow>
      <SettingsFieldRow
        label={t("settings.ongoing.matchmaking.acceptDelaySeconds.label")}
        settingId={ACCEPT_DELAY_SECONDS_SETTING_ID}
      >
        <SettingsInput
          ariaLabel="Setting ongoing.matchmaking.acceptDelayMs"
          type="number"
          value={String(acceptDelay)}
          min={ACCEPT_DELAY_MIN_SECONDS}
          max={ACCEPT_DELAY_MAX_SECONDS}
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
    </section>
  );
}

export function MiniBottomPanel({
  champSelectDodge,
  model,
}: {
  champSelectDodge?: ChampSelectDodgePanel;
  model: MiniWindowModel;
}) {
  const panelKind = resolveMiniBottomPanelKind(model.phase);

  switch (panelKind) {
    case "autoAccept":
      return <MiniAutoAcceptSettings />;
    case "champSelectDodge":
      return champSelectDodge ? (
        <MiniChampSelectDodgeSection
          pending={champSelectDodge.pending}
          error={champSelectDodge.error}
          onDodge={champSelectDodge.onDodge}
        />
      ) : null;
    case "none":
      return null;
  }
}
