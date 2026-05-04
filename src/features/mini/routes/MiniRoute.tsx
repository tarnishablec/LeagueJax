import { MapPinned } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { uncapitalize } from "remeda";
import { LcuImage } from "@/components/LcuImage";
import {
  SettingsFieldRow,
  SettingsInput,
  SettingsToggle,
} from "@/components/settings-ui";
import { useSettings } from "@/features/settings/context";
import type { SettingId } from "@/features/settings/types";
import { MiniChampSelectView } from "../components/MiniChampSelectView";
import {
  type MiniWindowModel,
  useMiniWindowModel,
} from "../hooks/use-mini-window-model";
import * as s from "./MiniRoute.css";

const AUTO_ACCEPT_SETTING_ID =
  "ongoing.matchmaking.autoAccept" satisfies SettingId;
const ACCEPT_DELAY_SECONDS_SETTING_ID =
  "ongoing.matchmaking.acceptDelayMs" satisfies SettingId;
const ACCEPT_DELAY_MIN_SECONDS = 0;
const ACCEPT_DELAY_MAX_SECONDS = 10;

function useSettingValue<T>(id: SettingId): T | undefined {
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

function useAutoAcceptCountdown(
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
  const autoAccept = useSettingValue<boolean>(AUTO_ACCEPT_SETTING_ID) ?? false;
  const acceptDelay =
    useSettingValue<number>(ACCEPT_DELAY_SECONDS_SETTING_ID) ?? 0;

  return (
    <>
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
    </>
  );
}

function phaseLabelKey(model: MiniWindowModel): string {
  if (model.isSpectating) {
    return "mini.phase.spectating";
  }

  return `mini.phase.${uncapitalize(model.phase)}`;
}

export function MiniRoute() {
  const model = useMiniWindowModel();
  const { t } = useTranslation();
  const autoAccept = useSettingValue<boolean>(AUTO_ACCEPT_SETTING_ID) ?? false;
  const acceptDelay =
    useSettingValue<number>(ACCEPT_DELAY_SECONDS_SETTING_ID) ?? 0;
  const autoAcceptCountdown = useAutoAcceptCountdown(
    autoAccept,
    acceptDelay,
    model.readyCheck,
  );

  if (model.phase === "ChampSelect" && model.champSelect) {
    return <MiniChampSelectView model={model} />;
  }

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
            <MapPinned className={s.mapFallback} size={52} aria-hidden="true" />
          )}
        </div>

        <div className={s.meta}>
          <strong className={s.queueName}>
            {model.queueName ?? t("mini.queue.empty")}
          </strong>
          <span className={s.phase}>{t(phaseLabelKey(model))}</span>
          {autoAcceptCountdown != null ? (
            <span className={s.autoAcceptCountdown}>
              {t("mini.autoAccept.countdown", {
                count: autoAcceptCountdown,
              })}
            </span>
          ) : null}
        </div>
      </div>

      <footer className={s.footer}>
        <MiniAutoAcceptSettings />
      </footer>
    </section>
  );
}
