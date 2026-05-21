/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import { invoke } from "@tauri-apps/api/core";
import { Unplug } from "lucide-solid";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { ProfileIcon } from "@/components/ProfileIcon";
import { SummonerID } from "@/components/SummonerID";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "../routes/HistoryRoute.css";

function InstanceCard(props: { instance: LcuInstanceInfo }): JSX.Element {
  return (
    <button
      type="button"
      class={s.focusPickerCard}
      onClick={() => invoke("lcu_update_focus", { pid: props.instance.pid })}
    >
      <div class={s.focusPickerHeader}>
        <div class={s.focusPickerAvatarWrap}>
          <ProfileIcon
            profileIconId={props.instance.summoner?.profileIconId}
            alt=""
            className={s.focusPickerAvatar}
            fallbackClassName={s.focusPickerAvatarFallback}
          />
        </div>
        <div class={s.focusPickerInfo}>
          <Show when={props.instance.summoner}>
            {(summoner) => <SummonerID summoner={summoner()} />}
          </Show>
          <span class={s.focusPickerDetail}>
            <span>{props.instance.region}</span>
            <span>PID: {props.instance.pid}</span>
          </span>
          <Show when={props.instance.installDir}>
            {(installDir) => (
              <span class={s.focusPickerPath}>{installDir()}</span>
            )}
          </Show>
        </div>
      </div>
    </button>
  );
}

export function ConnectionGuard(props: {
  instances: LcuInstanceInfo[];
}): JSX.Element {
  const { t } = useSolidTranslation();
  const readyInstances = createMemo(() =>
    props.instances.filter((instance) => instance.state === "ready"),
  );
  const instanceCards = keyArray(
    readyInstances,
    (instance) => String(instance.pid),
    (instance) => <InstanceCard instance={instance()} />,
  );

  return (
    <Show
      when={readyInstances().length > 0}
      fallback={
        <IconTitleSubtitleState
          icon={Unplug}
          title={t("common.disconnected")}
        />
      }
    >
      <div class={s.focusPicker}>
        <div class={s.focusPickerTitle}>{t("history.selectClient")}</div>
        {instanceCards()}
      </div>
    </Show>
  );
}
