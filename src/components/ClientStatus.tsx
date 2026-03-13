import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Unlink, Unplug } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { SummonerID } from "@/components/SummonerID.tsx";
import { selectIsFocused, useLcuStore } from "../stores/lcu";
import * as s from "./ClientStatus.css";

function useProfileIcon(iconId: number | null | undefined) {
  const query = useQuery({
    queryKey: ["profile-icon", iconId],
    queryFn: async () => {
      const bytes = await invoke<number[]>("get_profile_icon", {
        iconId,
      });
      const uint8 = new Uint8Array(bytes);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    },
    enabled: iconId != null,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return query.data ?? null;
}

// ─── Tooltip sub-components ─────────────────────────────────────────────────

function LcuClientCard({ instance: inst }: { instance: LcuInstanceInfo }) {
  const { t } = useTranslation();
  const isFocused = inst.isFocused;
  const isReady = inst.state === "ready";
  const hasSummoner = !!inst.summoner;
  const avatarUrl = useProfileIcon(inst.summoner?.profileIconId);

  const stateLabel =
    inst.state === "authenticating"
      ? t("clientStatus.authenticating")
      : inst.state === "closing"
        ? t("clientStatus.closing")
        : null;

  const info = (
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
            void invoke("lcu_unfocus");
          }}
          aria-label="Disconnect focus"
        >
          <Unlink size={14} />
        </button>
      ) : (
        <span
          className={s.stateIndicator({ state: inst.state })}
          aria-hidden="true"
        />
      )}
    </>
  );

  if (isFocused) {
    return (
      <div
        className={s.instanceRow({ focused: true })}
        title={inst.installDir ?? undefined}
      >
        {info}
      </div>
    );
  }

  if (isReady) {
    return (
      <button
        type="button"
        className={s.instanceRow({ clickable: true })}
        onClick={() => invoke("lcu_switch_focus", { pid: inst.pid })}
        title={inst.installDir ?? undefined}
      >
        {info}
      </button>
    );
  }

  return (
    <div
      className={s.instanceRow({ disabled: true })}
      title={inst.installDir ?? undefined}
    >
      {info}
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

// ─── Main component ─────────────────────────────────────────────────────────

interface ClientStatusProps {
  collapsed: boolean;
  iconSize: number;
}

export function ClientStatus({ collapsed, iconSize }: ClientStatusProps) {
  const { t } = useTranslation();
  const focusedInstance = useLcuStore(selectIsFocused);
  const summoner = focusedInstance?.summoner;
  const instances = useLcuStore((st) => st.instances);
  const avatarUrl = useProfileIcon(
    focusedInstance && summoner ? summoner.profileIconId : undefined,
  );

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
        <div className={s.trigger({ collapsed })}>
          {focusedInstance && summoner && avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile icon"
              width={iconSize * 1.3}
              height={iconSize * 1.3}
              className={s.avatar}
            />
          ) : (
            <Unplug
              size={iconSize}
              aria-hidden="true"
              style={{ justifySelf: "center" }}
            />
          )}
          <span className={s.label({ collapsed })}>
            {focusedInstance && summoner ? (
              <SummonerID summoner={summoner}></SummonerID>
            ) : (
              t("common.disconnected")
            )}
          </span>
        </div>
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
