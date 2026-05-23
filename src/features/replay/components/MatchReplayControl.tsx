/** @jsxImportSource solid-js */
import { Download, Loader, Play, RefreshCw, TriangleAlert } from "lucide-solid";
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import type {
  LcuReplayDownloadState,
  ReplayMatchContext,
} from "@/bindings/replay";
import { AppTooltip } from "@/components/AppTooltip";
import { CopyButton } from "@/components/CopyButton";
import { useSolidTranslation } from "@/i18n/solid";
import { useSolidMatchReplay } from "../hooks/use-match-replay";
import * as s from "./MatchReplayControl.css.ts";

type MatchReplay = ReturnType<typeof useSolidMatchReplay>;
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
  t: ReturnType<typeof useSolidTranslation>["t"],
  replay: MatchReplay,
  state: LcuReplayDownloadState | null,
  progress: string,
): string {
  if (replay.error() !== null) return t("replay.matchReplay.failed");
  if (replay.isLoading() || state === "checking") {
    return t("replay.matchReplay.checking");
  }

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
    !replay.isLoading() &&
    !replay.isActing()
  );
}

function replayIconKind(
  replay: MatchReplay,
  state: LcuReplayDownloadState | null,
  busy: boolean,
  canWatch: boolean,
): ReplayIconKind {
  if (replay.error()) return "error";
  if (busy) return "busy";
  if (canWatch) return "watch";
  if (state === "incompatible") return "incompatible";
  if (state === "checking" || state === "found") return "checking";
  return "download";
}

function replayIcon(kind: ReplayIconKind): JSX.Element {
  switch (kind) {
    case "error":
    case "incompatible":
      return <TriangleAlert size={15} aria-hidden="true" />;
    case "busy":
      return <Loader size={15} aria-hidden="true" class={s.spin} />;
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

export function MatchReplayControl(props: {
  context: ReplayMatchContext;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const replay = useSolidMatchReplay(() => props.context);
  const state = createMemo(() => replay.downloadState());
  const busy = createMemo(
    () => replay.isLoading() || replay.isActing() || state() === "downloading",
  );
  const progress = createMemo(() => progressLabel(replay.progress()));
  const label = createMemo(() => replayLabel(t, replay, state(), progress()));
  const canWatch = createMemo(() => state() === "watch" && !replay.isActing());
  const canDownload = createMemo(() => canDownloadReplay(replay, state()));
  const disabled = createMemo(() => !canWatch() && !canDownload());
  const icon = createMemo(() =>
    replayIcon(replayIconKind(replay, state(), busy(), canWatch())),
  );
  const tooltip = createMemo(() =>
    replayTooltip(replay.error(), label(), progress()),
  );

  const handleClick = () => {
    const action = canWatch() ? replay.watch : replay.download;
    void action();
  };

  return (
    <span class={s.root}>
      <CopyButton
        text={String(props.context.gameId)}
        className={s.copyButton}
        aria-label="Copy game ID"
      />
      <AppTooltip content={tooltip()} openDelay={180} closeDelay={0}>
        {(triggerProps) => (
          <button
            {...triggerProps({
              type: "button",
              class: s.button({
                tone:
                  replay.error() || state() === "incompatible"
                    ? "danger"
                    : "default",
              }),
              "aria-label": "Replay action",
              disabled: disabled(),
              onClick: handleClick,
            })}
          >
            {icon()}
          </button>
        )}
      </AppTooltip>
    </span>
  );
}
