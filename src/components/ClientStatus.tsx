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
import { Unplug } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "../stores/lcu";
import { selectIsConnected, useLcuStore } from "../stores/lcu";

import * as s from "./ClientStatus.css";

function truncatePath(path: string, max = 25): string {
  if (path.length <= max) return path;
  return `${path.slice(0, max - 3)}...`;
}

function useProfileIcon(iconId: number | undefined) {
  const prevUrl = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["profile-icon", iconId],
    queryFn: async () => {
      const bytes = await invoke<number[]>("get_profile_icon", {
        iconId,
      });
      const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
      return URL.createObjectURL(blob);
    },
    enabled: iconId !== undefined,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (prevUrl.current && prevUrl.current !== query.data) {
      URL.revokeObjectURL(prevUrl.current);
    }
    prevUrl.current = query.data ?? null;

    return () => {
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = null;
      }
    };
  }, [query.data]);

  return query.data ?? null;
}

// ─── Tooltip content ────────────────────────────────────────────────────────

function InstanceList({ instances }: { instances: LcuInstanceInfo[] }) {
  const { t } = useTranslation();

  if (instances.length === 0) {
    return <div className={s.emptyText}>{t("common.noClients")}</div>;
  }

  return instances.map((inst) => (
    <InstanceRow key={inst.pid} instance={inst} />
  ));
}

function InstanceRow({ instance: inst }: { instance: LcuInstanceInfo }) {
  const isReady = inst.state === "ready";
  const canSwitch = isReady && !inst.isFocused;

  const content = (
    <>
      <span className={s.instancePath}>
        {inst.installDir ? truncatePath(inst.installDir) : `Port ${inst.port}`}
      </span>
      <span className={s.instancePid}>PID: {inst.pid}</span>
      {inst.isFocused && <span className={s.focusDot} />}
    </>
  );

  if (canSwitch) {
    return (
      <button
        type="button"
        className={s.instanceRow({ focused: false })}
        onClick={() => invoke("lcu_switch_focus", { pid: inst.pid })}
        title={inst.installDir ?? undefined}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={s.instanceRow({
        focused: inst.isFocused,
        disabled: !isReady,
      })}
      title={inst.installDir ?? undefined}
    >
      {content}
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
  const connected = useLcuStore(selectIsConnected);
  const summoner = useLcuStore((st) => st.summoner);
  const instances = useLcuStore((st) => st.instances);
  const avatarUrl = useProfileIcon(
    connected && summoner ? summoner.profileIconId : undefined,
  );

  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "right-end",
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
          {connected && summoner && avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile icon"
              width={iconSize}
              height={iconSize}
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
            {connected && summoner
              ? `${summoner.gameName}#${summoner.tagLine}`
              : t("common.disconnected")}
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
            <InstanceList instances={instances} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
