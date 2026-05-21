/** @jsxImportSource solid-js */
import { MapPinned } from "lucide-solid";
import { uncapitalize } from "remeda";
import { createMemo, Show } from "solid-js";
import { LcuImage } from "@/components/LcuImage";
import { useSolidTranslation } from "@/i18n/solid";
import {
  ACCEPT_DELAY_SECONDS_SETTING_ID,
  AUTO_ACCEPT_SETTING_ID,
  MiniBottomPanel,
  useSolidAutoAcceptCountdown,
  useSolidMiniSettingValue,
} from "../components/MiniBottomPanel";
import { MiniChampSelectView } from "../components/MiniChampSelectView";
import {
  type MiniWindowModel,
  useSolidMiniWindowModel,
} from "../hooks/use-mini-window-model";
import * as s from "./MiniRoute.css";

function phaseLabelKey(model: MiniWindowModel): string {
  if (model.isSpectating) {
    return "mini.phase.spectating";
  }

  return `mini.phase.${uncapitalize(model.phase)}`;
}

export function MiniRoute() {
  const model = useSolidMiniWindowModel();
  const { t } = useSolidTranslation();
  const autoAccept = useSolidMiniSettingValue<boolean>(AUTO_ACCEPT_SETTING_ID);
  const acceptDelay = useSolidMiniSettingValue<number>(
    ACCEPT_DELAY_SECONDS_SETTING_ID,
  );
  const autoAcceptCountdown = useSolidAutoAcceptCountdown(
    () => autoAccept() ?? false,
    () => acceptDelay() ?? 0,
    () => model().readyCheck,
  );
  const queueName = createMemo(
    () => model().queueName ?? t("mini.queue.empty"),
  );
  const phaseLabel = createMemo(() => t(phaseLabelKey(model())));

  return (
    <Show
      when={model().phase === "ChampSelect" && model().champSelect}
      fallback={
        <section class={s.root}>
          <div class={s.hero}>
            <div class={s.mapIconFrame}>
              <Show
                when={model().queueIconSrc}
                fallback={
                  <MapPinned
                    class={s.mapFallback}
                    size={52}
                    aria-hidden="true"
                  />
                }
              >
                {(src) => (
                  <LcuImage
                    className={s.mapImage}
                    src={src()}
                    alt="Queue icon"
                  />
                )}
              </Show>
            </div>

            <div class={s.meta}>
              <strong class={s.queueName}>{queueName()}</strong>
              <span class={s.phase}>{phaseLabel()}</span>
              <Show when={autoAcceptCountdown() != null}>
                <span class={s.autoAcceptCountdown}>
                  {t("mini.autoAccept.countdown", {
                    count: autoAcceptCountdown() ?? 0,
                  })}
                </span>
              </Show>
            </div>
          </div>

          <MiniBottomPanel model={model()} />
        </section>
      }
    >
      <MiniChampSelectView model={model()} />
    </Show>
  );
}
