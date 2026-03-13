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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo, Summoner } from "../stores/lcu";
import { selectIsConnected, useLcuStore } from "../stores/lcu";

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

function ConnectedClientCard({
  summoner,
  avatarUrl,
  pid,
}: {
  summoner: Summoner;
  avatarUrl: string | null;
  pid: number;
}) {
  return (
    <div className={s.connectedCard}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="Profile icon" className={s.profileIcon} />
      ) : (
        <div className={s.profileIcon} />
      )}
      <div className={s.summonerInfo}>
        <div className={s.summonerName}>
          {summoner.gameName}
          <span className={s.summonerTag}>#{summoner.tagLine}</span>
        </div>
        <div className={s.summonerLevel}>
          Lv. {summoner.summonerLevel} · PID: {pid}
        </div>
      </div>
    </div>
  );
}

function InstanceCard({ instance: inst }: { instance: LcuInstanceInfo }) {
  const { t } = useTranslation();
  const isReady = inst.state === "ready";
  const hasSummoner = inst.gameName && inst.tagLine;
  const avatarUrl = useProfileIcon(inst.profileIconId);

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
          {hasSummoner
            ? `${inst.gameName}#${inst.tagLine}`
            : (inst.installDir ?? `Port ${inst.port}`)}
        </span>
        <span className={s.instancePid}>
          PID: {inst.pid}
          {stateLabel ? ` · ${stateLabel}` : ""}
        </span>
      </div>
      <span
        className={s.stateIndicator({ state: inst.state })}
        aria-hidden="true"
      />
    </>
  );

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
      className={s.instanceRow({ disabled: !isReady })}
      title={inst.installDir ?? undefined}
    >
      {info}
    </div>
  );
}

function TooltipContent({
  instances,
  summoner,
  avatarUrl,
}: {
  instances: LcuInstanceInfo[];
  summoner: Summoner | null;
  avatarUrl: string | null;
}) {
  const { t } = useTranslation();

  const focused = instances.find((i) => i.isFocused);
  const others = instances.filter((i) => !i.isFocused);

  if (instances.length === 0) {
    return <div className={s.emptyText}>{t("clientStatus.noClients")}</div>;
  }

  return (
    <>
      {focused && summoner && (
        <ConnectedClientCard
          summoner={summoner}
          avatarUrl={avatarUrl}
          pid={focused.pid}
        />
      )}

      {focused && summoner && others.length > 0 && (
        <div className={s.separator} />
      )}

      {others.length > 0 && (
        <>
          {/*<div className={s.sectionHeader}>*/}
          {/*  {t("clientStatus.otherClients")}*/}
          {/*</div>*/}
          <div className={s.instanceList}>
            {others.map((inst) => (
              <InstanceCard key={inst.pid} instance={inst} />
            ))}
          </div>
        </>
      )}
    </>
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
            <TooltipContent
              instances={instances}
              summoner={summoner}
              avatarUrl={avatarUrl}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
