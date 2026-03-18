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
import { Unlink, Unplug } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { SummonerID } from "@/components/SummonerID.tsx";
import { useProfileIcon } from "@/hooks/use-profile-icon.ts";
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
  isLoading,
  iconSize,
}: {
  avatarUrl: string | null;
  hasSummoner: boolean;
  isLoading: boolean;
  iconSize: number;
}) {
  if (hasSummoner && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Profile icon"
        width={iconSize * 1.3}
        height={iconSize * 1.3}
        className={s.avatar}
      />
    );
  }

  if (isLoading) {
    return (
      <div
        className={s.avatarLoading}
        style={assignInlineVars({
          [s.avatarSizeVar]: `${iconSize * 1.3}px`,
        })}
        aria-label="Connecting"
        role="img"
      />
    );
  }

  return (
    <Unplug
      size={iconSize}
      aria-hidden="true"
      style={{ justifySelf: "center" }}
    />
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
  const avatarUrl = useProfileIcon(inst.summoner?.profileIconId);
  const hasSummoner = !!inst.summoner;
  const stateLabel = renderInstanceStateLabel(displayState, t);

  return (
    <>
      {hasSummoner && avatarUrl ? (
        <img src={avatarUrl} alt="Profile icon" className={s.instanceIcon} />
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
            inst.installDir ?? `Port ${inst.port}`
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

export function ClientStatus({ collapsed, iconSize }: ClientStatusProps) {
  const navigate = useNavigate();
  const openTab = useTabStore((st) => st.openTab);
  const focusedReady = useLcuStore(selectIsFocused);
  const focusedInstance = useLcuStore((st) =>
    st.instances.find((i) => i.isFocused),
  );
  const focusedDisplayState = focusedInstance
    ? normalizeState(focusedInstance.state)
    : null;
  const instances = useLcuStore((st) => st.instances);

  const summoner = focusedReady?.summoner;
  const hasFocusedSummoner = !!(focusedReady && summoner);
  const avatarUrl = useProfileIcon(
    hasFocusedSummoner ? summoner?.profileIconId : undefined,
  );
  const isLoading = !!focusedInstance && focusedInstance.state !== "ready";

  const handleClick = () => {
    if (!summoner) {
      return;
    }
    openTab(summoner);
    void navigate("/history");
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
            isLoading={isLoading}
            iconSize={iconSize}
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

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className={s.tooltip}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <TooltipContent instances={instances} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}