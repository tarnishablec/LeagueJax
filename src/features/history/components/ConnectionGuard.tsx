import { invoke } from "@tauri-apps/api/core";
import { Unplug } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { LazyImage } from "@/components/LazyImage";
import { useDragonStaticData } from "@/hooks/use-dragon-static-data";
import * as s from "../routes/HistoryRoute.css";
import { SummonerID } from "@/components/SummonerID.tsx";

function InstanceCard({ instance }: { instance: LcuInstanceInfo }) {
  const profileIconId = instance.summoner?.profileIconId ?? 0;
  const { src: avatarUrl } = useDragonStaticData({
    type: "profile-icon",
    profileIconId,
  });

  return (
    <button
      type="button"
      className={s.focusPickerCard}
      onClick={() => invoke("lcu_update_focus", { pid: instance.pid })}
    >
      <div className={s.focusPickerHeader}>
        <div className={s.focusPickerAvatarWrap}>
          {avatarUrl ? (
            <LazyImage src={avatarUrl} alt="" className={s.focusPickerAvatar} />
          ) : (
            <div className={s.focusPickerAvatarFallback} />
          )}
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
