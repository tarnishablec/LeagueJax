import { MapPinned } from "lucide-react";
import { useTranslation } from "react-i18next";
import { uncapitalize } from "remeda";
import { LcuImage } from "@/components/LcuImage";
import {
  ACCEPT_DELAY_SECONDS_SETTING_ID,
  AUTO_ACCEPT_SETTING_ID,
  MiniBottomPanel,
  useAutoAcceptCountdown,
  useMiniSettingValue,
} from "../components/MiniBottomPanel";
import { MiniChampSelectView } from "../components/MiniChampSelectView";
import {
  type MiniWindowModel,
  useMiniWindowModel,
} from "../hooks/use-mini-window-model";
import * as s from "./MiniRoute.css";

function phaseLabelKey(model: MiniWindowModel): string {
  if (model.isSpectating) {
    return "mini.phase.spectating";
  }

  return `mini.phase.${uncapitalize(model.phase)}`;
}

export function MiniRoute() {
  const model = useMiniWindowModel();
  const { t } = useTranslation();
  const autoAccept =
    useMiniSettingValue<boolean>(AUTO_ACCEPT_SETTING_ID) ?? false;
  const acceptDelay =
    useMiniSettingValue<number>(ACCEPT_DELAY_SECONDS_SETTING_ID) ?? 0;
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
          {model.queueIconSrc ? (
            <LcuImage
              className={s.mapImage}
              src={model.queueIconSrc}
              alt="Queue icon"
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

      <MiniBottomPanel model={model} />
    </section>
  );
}
