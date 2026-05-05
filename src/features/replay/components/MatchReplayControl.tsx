import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { AlertTriangle, Download, Loader, Play, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  LcuReplayDownloadState,
  ReplayMatchContext,
} from "@/bindings/replay";
import { useMatchReplay } from "../hooks/use-match-replay";
import * as s from "./MatchReplayControl.css";

type MatchReplay = ReturnType<typeof useMatchReplay>;
type ReplayIconKind =
  | "error"
  | "busy"
  | "watch"
  | "incompatible"
  | "checking"
  | "download";

function progressLabel(progress: number | null): string {
  return progress === null ? "" : `${progress}%`;
}

function replayLabel(
  t: ReturnType<typeof useTranslation>["t"],
  replay: MatchReplay,
  state: LcuReplayDownloadState | null,
  progress: string,
): string {
  if (replay.error !== null) return t("replay.matchReplay.failed");
  if (replay.isLoading || state === "checking")
    return t("replay.matchReplay.checking");

  switch (state) {
    case "watch":
      return t("replay.matchReplay.watch");
    case "downloading":
      return t("replay.matchReplay.downloading", { progress });
    case "incompatible":
      return t("replay.matchReplay.incompatible");
    default:
      return t("replay.matchReplay.download");
  }
}

function canDownloadReplay(
  replay: MatchReplay,
  state: LcuReplayDownloadState | null,
): boolean {
  return (
    state !== "watch" &&
    state !== "downloading" &&
    state !== "incompatible" &&
    !replay.isLoading &&
    !replay.isActing
  );
}

function replayIconKind(
  replay: MatchReplay,
  state: LcuReplayDownloadState | null,
  busy: boolean,
  canWatch: boolean,
): ReplayIconKind {
  if (replay.error) return "error";
  if (busy) return "busy";
  if (canWatch) return "watch";
  if (state === "incompatible") return "incompatible";
  if (state === "checking" || state === "found") return "checking";
  return "download";
}

function replayIcon(kind: ReplayIconKind): ReactNode {
  switch (kind) {
    case "error":
    case "incompatible":
      return <AlertTriangle size={15} aria-hidden="true" />;
    case "busy":
      return <Loader size={15} aria-hidden="true" className={s.spin} />;
    case "watch":
      return <Play size={15} aria-hidden="true" />;
    case "checking":
      return <RefreshCw size={15} aria-hidden="true" />;
    case "download":
      return <Download size={15} aria-hidden="true" />;
  }
}

function replayTooltip(
  error: string | null,
  label: string,
  progress: string,
): string {
  if (error) return `${label}: ${error}`;
  if (progress) return `${label} ${progress}`;
  return label;
}

export function MatchReplayControl({
  context,
}: {
  context: ReplayMatchContext;
}) {
  const { t } = useTranslation();
  const replay = useMatchReplay(context);
  const state = replay.downloadState;
  const busy = replay.isLoading || replay.isActing || state === "downloading";
  const progress = progressLabel(replay.progress);
  const label = replayLabel(t, replay, state, progress);
  const canWatch = state === "watch" && !replay.isActing;
  const canDownload = canDownloadReplay(replay, state);
  const disabled = !canWatch && !canDownload;
  const onClick = canWatch ? replay.watch : replay.download;
  const icon = replayIcon(replayIconKind(replay, state, busy, canWatch));
  const tooltip = replayTooltip(replay.error, label, progress);

  return (
    <span className={s.root}>
      <Tooltip.Root openDelay={180} closeDelay={0}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={s.button({
              tone:
                replay.error || state === "incompatible" ? "danger" : "default",
            })}
            aria-label="Replay action"
            disabled={disabled}
            onClick={() => void onClick()}
          >
            {icon}
          </button>
        </Tooltip.Trigger>
        <Portal>
          <Tooltip.Positioner className={s.tooltipPositioner}>
            <Tooltip.Content className={s.tooltipContent}>
              {tooltip}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Portal>
      </Tooltip.Root>
      {/*<span className={s.statusText}>{label}</span>*/}
    </span>
  );
}
