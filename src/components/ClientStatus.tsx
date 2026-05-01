import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { invoke } from "@tauri-apps/api/core";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { LoaderCircle, Unlink, Unplug } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { LazyImage } from "@/components/LazyImage.tsx";
import { SummonerID } from "@/components/SummonerID.tsx";
import { useCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import { selectIsFocused, useLcuStore } from "../stores/lcu";
import { useTabStore } from "../stores/tabs";
import * as s from "./ClientStatus.css";

type ClientDisplayState = Exclude<LcuInstanceInfo["state"], "idle">;

function normalizeState(state: LcuInstanceInfo["state"]): ClientDisplayState {
  return state === "idle" ? "authenticating" : state;
}

function renderInstanceStateLabel(
  state: ClientDisplayState,
  t: (key: string) => string,
): string | null {
  if (state === "authenticating") {
    return t("clientStatus.authenticating");
  }
  if (state === "closing") {
    return t("clientStatus.closing");
  }
  return null;
}

function TriggerIcon({
  avatarUrl,
  hasSummoner,
  isConnecting,
  collapsed,
}: {
  avatarUrl: string | null;
  hasSummoner: boolean;
  isConnecting: boolean;
  collapsed: boolean;
}) {
  const [imageErrored, setImageErrored] = useState(false);
  const iconScaleClassName = s.iconScale({ collapsed });

  if (hasSummoner && avatarUrl && !imageErrored) {
    return (
      <LazyImage
        src={avatarUrl}
        alt="Profile icon"
        className={`${s.avatar} ${iconScaleClassName}`}
        style={assignInlineVars({
          [s.avatarSizeVar]: "20.8px",
        })}
        fallbackClassName={`${s.avatar} ${iconScaleClassName}`}
        onError={() => setImageErrored(true)}
      />
    );
  }

  if (isConnecting) {
    return (
      <span className={`${s.triggerIconFrame} ${iconScaleClassName}`}>
        <LoaderCircle
          size={16}
          aria-hidden="true"
          className={s.connectingIcon}
        />
      </span>
    );
  }

  return (
    <span className={`${s.triggerIconFrame} ${iconScaleClassName}`}>
      <Unplug size={16} aria-hidden="true" />
    </span>
  );
}

function TriggerLabel({
  hasFocusedSummoner,
  summoner,
  focusedState,
}: {
  hasFocusedSummoner: boolean;
  summoner: LcuInstanceInfo["summoner"] | undefined;
  focusedState: ClientDisplayState | null;
}) {
  const { t } = useTranslation();

  if (hasFocusedSummoner && summoner) {
    return <SummonerID summoner={summoner} />;
  }

  if (focusedState) {
    return focusedState === "closing"
      ? t("clientStatus.closing")
      : t("clientStatus.authenticating");
  }

  return t("common.disconnected");
}

function ClientCardContent({
  inst,
  displayState,
  isFocused,
}: {
  inst: LcuInstanceInfo;
  displayState: ClientDisplayState;
  isFocused: boolean;
}) {
  const { t } = useTranslation();
  const { src: avatarUrl } = useCdragonStaticData({
    type: "profile-icon",
    profileIconId: inst.summoner?.profileIconId ?? 0,
  });
  const hasSummoner = !!inst.summoner;
  const stateLabel = renderInstanceStateLabel(displayState, t);

  return (
    <>
      {hasSummoner && avatarUrl ? (
        <LazyImage
          src={avatarUrl}
          alt="Profile icon"
          className={s.instanceIcon}
          fallbackClassName={s.instanceIconFallback}
        />
      ) : (
        <div className={s.instanceIconFallback}>
          <Unplug size={14} aria-hidden="true" />
        </div>
      )}
      <div className={s.instanceInfo}>
        <span className={s.instancePath}>
          {inst.summoner ? (
            <SummonerID summoner={inst.summoner} />
          ) : (
            (inst.installDir ?? `Port ${inst.port}`)
          )}
        </span>
        <span className={s.instancePid}>
          PID: {inst.pid}
          {stateLabel ? ` · ${stateLabel}` : ""}
        </span>
      </div>
      {isFocused ? (
        <button
          type="button"
          title={t("clientStatus.unfocus")}
          className={s.unfocusButton}
          onClick={(e) => {
            e.stopPropagation();
            void invoke("lcu_update_focus", { pid: null });
          }}
          aria-label="Disconnect focus"
        >
          <Unlink size={14} />
        </button>
      ) : (
        <span
          className={s.stateIndicator({ state: displayState })}
          aria-hidden="true"
        />
      )}
    </>
  );
}

function LcuClientCard({ instance: inst }: { instance: LcuInstanceInfo }) {
  const displayState = normalizeState(inst.state);
  const isFocused = inst.isFocused;
  const isReady = inst.state === "ready";
  const content = (
    <ClientCardContent
      inst={inst}
      displayState={displayState}
      isFocused={isFocused}
    />
  );

  if (isFocused) {
    return (
      <div
        className={s.instanceRow({ focused: true })}
        title={inst.installDir ?? undefined}
      >
        {content}
      </div>
    );
  }

  if (isReady) {
    return (
      <button
        type="button"
        className={s.instanceRow({ clickable: true })}
        onClick={() => invoke("lcu_update_focus", { pid: inst.pid })}
        title={inst.installDir ?? undefined}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={s.instanceRow({ disabled: true })}
      title={inst.installDir ?? undefined}
    >
      {content}
    </div>
  );
}

function TooltipContent({ instances }: { instances: LcuInstanceInfo[] }) {
  if (instances.length === 0) {
    return null;
  }

  return (
    <div className={s.instanceList}>
      {instances.map((inst) => (
        <LcuClientCard key={inst.pid} instance={inst} />
      ))}
    </div>
  );
}

interface ClientStatusProps {
  collapsed: boolean;
  iconSize: number;
}

export function ClientStatus({ collapsed }: ClientStatusProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openTab = useTabStore((st) => st.openTab);
  const focusedReady = useLcuStore(selectIsFocused);
  const focusedInstance = useLcuStore((st) =>
    st.instances.find((i) => i.isFocused),
  );
  const instances = useLcuStore((st) => st.instances);
  const connectingInstance = useLcuStore((st) =>
    st.instances.find((i) => i.state !== "ready" && i.state !== "closing"),
  );
  const activeInstance = focusedInstance ?? connectingInstance;
  const focusedDisplayState = activeInstance
    ? normalizeState(activeInstance.state)
    : null;

  const summoner = focusedReady?.summoner;
  const hasFocusedSummoner = !!(focusedReady && summoner);
  const { src: avatarUrl } = useCdragonStaticData({
    type: "profile-icon",
    profileIconId: hasFocusedSummoner ? (summoner?.profileIconId ?? 0) : 0,
  });
  const isConnecting = !!activeInstance && !hasFocusedSummoner;

  const handleClick = () => {
    if (!summoner) {
      return;
    }
    openTab(summoner.puuid);
    void navigate("/main/history");
  };

  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "right",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });
  const hover = useHover(context, { delay: { open: 0, close: 80 } });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);
  const hasInstances = instances.length > 0;
  const shouldShowTooltip = hasInstances || collapsed;

  return (
    <>
      <div
        ref={refs.setReference}
        className={s.container}
        {...getReferenceProps()}
      >
        <button
          type="button"
          className={s.trigger({ collapsed })}
          onClick={handleClick}
        >
          <TriggerIcon
            avatarUrl={avatarUrl}
            hasSummoner={hasFocusedSummoner}
            isConnecting={isConnecting}
            collapsed={collapsed}
          />
          <span className={s.label({ collapsed })}>
            <TriggerLabel
              hasFocusedSummoner={hasFocusedSummoner}
              summoner={summoner}
              focusedState={focusedDisplayState}
            />
          </span>
        </button>
      </div>

      {open && shouldShowTooltip ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className={hasInstances ? s.tooltip : s.emptyTooltip}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            {hasInstances ? (
              <TooltipContent instances={instances} />
            ) : (
              t("clientStatus.noClients")
            )}
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}
