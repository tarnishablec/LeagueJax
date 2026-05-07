import { invoke } from "@tauri-apps/api/core";
import { Unplug } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { ProfileIcon } from "@/components/ProfileIcon";
import { SummonerID } from "@/components/SummonerID.tsx";
import * as s from "../routes/HistoryRoute.css";

function InstanceCard({ instance }: { instance: LcuInstanceInfo }) {
  return (
    <button
      type="button"
      className={s.focusPickerCard}
      onClick={() => invoke("lcu_update_focus", { pid: instance.pid })}
    >
      <div className={s.focusPickerHeader}>
        <div className={s.focusPickerAvatarWrap}>
          <ProfileIcon
            profileIconId={instance.summoner?.profileIconId}
            alt=""
            className={s.focusPickerAvatar}
            fallbackClassName={s.focusPickerAvatarFallback}
          />
        </div>
        <div className={s.focusPickerInfo}>
          {instance.summoner ? (
            <SummonerID summoner={instance.summoner} />
          ) : null}
          <span className={s.focusPickerDetail}>
            <span>{instance.region}</span>
            <span>PID: {instance.pid}</span>
          </span>
          {instance.installDir ? (
            <span className={s.focusPickerPath}>{instance.installDir}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function ConnectionGuard({
  instances,
}: {
  instances: LcuInstanceInfo[];
}) {
  const { t } = useTranslation();
  const readyInstances = instances.filter(
    (instance) => instance.state === "ready",
  );

  if (readyInstances.length === 0) {
    return (
      <IconTitleSubtitleState icon={Unplug} title={t("common.disconnected")} />
    );
  }

  return (
    <div className={s.focusPicker}>
      <div className={s.focusPickerTitle}>{t("history.selectClient")}</div>
      {readyInstances.map((instance) => (
        <InstanceCard key={instance.pid} instance={instance} />
      ))}
    </div>
  );
}
