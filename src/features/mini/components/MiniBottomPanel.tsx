/** @jsxImportSource solid-js */

import type { Accessor } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  onCleanup,
  Show,
  Switch,
} from "solid-js";
import { SettingsFieldRow } from "@/components/settings-ui/SettingsFieldRow";
import { SettingsInput } from "@/components/settings-ui/SettingsInput";
import { SettingsToggle } from "@/components/settings-ui/SettingsToggle";
import { useSolidSettings } from "@/features/settings/solid-context";
import type { SettingId } from "@/features/settings/types";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
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

export function useSolidMiniSettingValue<T>(
  id: SettingId,
): Accessor<T | undefined> {
  return useSolidSettingValue<T>(id);
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

export function useSolidAutoAcceptCountdown(
  enabled: Accessor<boolean>,
  delaySeconds: Accessor<number>,
  readyCheck: Accessor<MiniWindowModel["readyCheck"]>,
): Accessor<number | null> {
  const active = createMemo(() =>
    shouldShowAutoAcceptCountdown(enabled(), readyCheck()),
  );
  const [deadline, setDeadline] = createSignal<number | null>(null);
  const [now, setNow] = createSignal(Date.now());

  createEffect(() => {
    if (!active()) {
      setDeadline(null);
      return;
    }

    const current = Date.now();
    setNow(current);
    const normalizedDelay = Math.min(
      ACCEPT_DELAY_MAX_SECONDS,
      Math.max(ACCEPT_DELAY_MIN_SECONDS, delaySeconds()),
    );
    setDeadline(current + normalizedDelay * 1000);
  });

  createEffect(() => {
    if (deadline() == null) {
      return;
    }

    const tick = () => setNow(Date.now());
    tick();
    const intervalId = window.setInterval(tick, 250);
    onCleanup(() => window.clearInterval(intervalId));
  });

  return createMemo(() => {
    const currentDeadline = deadline();
    if (!active() || currentDeadline == null) {
      return null;
    }

    return Math.max(0, Math.ceil((currentDeadline - now()) / 1000));
  });
}

function MiniAutoAcceptSettings() {
  const settings = useSolidSettings();
  const { t } = useSolidTranslation();
  const autoAccept = useSolidMiniSettingValue<boolean>(AUTO_ACCEPT_SETTING_ID);
  const acceptDelay = useSolidMiniSettingValue<number>(
    ACCEPT_DELAY_SECONDS_SETTING_ID,
  );

  return (
    <section class={s.autoAcceptPanel}>
      <SettingsFieldRow
        label={t("settings.ongoing.matchmaking.autoAccept.label")}
        settingId={AUTO_ACCEPT_SETTING_ID}
      >
        <SettingsToggle
          ariaLabel="Setting ongoing.matchmaking.autoAccept"
          checked={autoAccept() ?? false}
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
          value={String(acceptDelay() ?? 0)}
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

export function MiniBottomPanel(props: {
  champSelectDodge?: ChampSelectDodgePanel;
  model: MiniWindowModel;
}) {
  const panelKind = createMemo(() =>
    resolveMiniBottomPanelKind(props.model.phase),
  );

  return (
    <Switch>
      <Match when={panelKind() === "autoAccept"}>
        <MiniAutoAcceptSettings />
      </Match>
      <Match when={panelKind() === "champSelectDodge"}>
        <Show when={props.champSelectDodge}>
          {(champSelectDodge) => (
            <MiniChampSelectDodgeSection
              pending={champSelectDodge().pending}
              error={champSelectDodge().error}
              onDodge={champSelectDodge().onDodge}
            />
          )}
        </Show>
      </Match>
    </Switch>
  );
}
