/** @jsxImportSource solid-js */
import { Key } from "@solid-primitives/keyed";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  FolderOpen,
  HardDrive,
  Loader,
  Monitor,
  Play,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-solid";
import type { JSX } from "solid-js";
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import type { LcuInstanceInfo } from "@/bindings/lcu";
import type {
  ReplayEntry,
  ReplayExecutableTarget,
  ReplayLibrarySnapshot,
} from "@/bindings/replay";
import type { RevealPathResult } from "@/bindings/tauri_host";
import { AppTooltip } from "@/components/AppTooltip";
import { LazyImage } from "@/components/LazyImage";
import { ScrollArea } from "@/components/scroll-area/ScrollArea";
import { useSolidCdragonChampionCatalog } from "@/hooks/use-cdragon-champion-summary";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./ReplayRoute.css.ts";
import {
  buildExecutableResources,
  type ExecutableResource,
  entryMatches,
  executableDetailLabel,
  executableReason,
  executableRevealTarget,
  executableStatusLabel,
  executableStatusTone,
  familyLabel,
  familyTone,
  folderCanRemove,
  folderStatusLabel,
  folderTooltip,
  formatBytes,
  formatDate,
  isPositionInsideElement,
  patchLabel,
  playTooltip,
  replayChampionIconItems,
} from "./replay-route-model";

const LCU_REFRESH_DEBOUNCE_MS = 180;

function cx(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function LoadingStatusRow(props: {
  ariaLabel: string;
  label: string;
}): JSX.Element {
  return (
    <div class={s.loadingStatusRow} role="status" aria-label={props.ariaLabel}>
      <Loader
        class={cx(s.loadingStatusIcon, s.spin)}
        size={14}
        aria-hidden="true"
      />
      <span class={s.loadingLabel}>{props.label}</span>
    </div>
  );
}

function executableDetailClassName(resource: ExecutableResource): string {
  if (resource.family === "RIOT" && resource.clients.length === 0) {
    return s.tintText;
  }
  return s.mutedText;
}

export function ReplayRoute(): JSX.Element {
  const { t } = useSolidTranslation();
  const championCatalog = useSolidCdragonChampionCatalog();
  const [snapshot, setSnapshot] = createSignal<ReplayLibrarySnapshot | null>(
    null,
  );
  const [query, setQuery] = createSignal("");
  const [busy, setBusy] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [draggingFolder, setDraggingFolder] = createSignal(false);
  let lcuRefreshTimer: number | null = null;
  let dropzoneRef: HTMLButtonElement | undefined;

  const operationFailed = (caught: unknown) =>
    t("replay.operationFailed", { reason: String(caught) });
  const initialLoading = createMemo(() => busy() && snapshot() === null);
  const entries = createMemo(() =>
    (snapshot()?.entries ?? []).filter((entry) =>
      entryMatches(entry, query(), championCatalog()),
    ),
  );
  const folders = createMemo(() => snapshot()?.folders ?? []);
  const executableResources = createMemo(() =>
    buildExecutableResources(snapshot()),
  );

  const refreshSnapshot = async () => {
    try {
      const next = await invoke<ReplayLibrarySnapshot>("replay_get_snapshot");
      setSnapshot(next);
    } catch (caught) {
      setError(operationFailed(caught));
    }
  };

  const loadSnapshot = async (command = "replay_get_snapshot") => {
    setBusy(true);
    setError(null);
    try {
      const next = await invoke<ReplayLibrarySnapshot>(command);
      setSnapshot(next);
    } catch (caught) {
      setError(operationFailed(caught));
    } finally {
      setBusy(false);
    }
  };

  const addFolderPath = async (folderPath: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await invoke<ReplayLibrarySnapshot>("replay_add_folder", {
        path: folderPath,
      });
      setSnapshot(next);
    } catch (caught) {
      setError(operationFailed(caught));
    } finally {
      setBusy(false);
    }
  };

  const pickFolder = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await invoke<ReplayLibrarySnapshot | null>(
        "replay_pick_folder",
      );
      if (next) {
        setSnapshot(next);
      }
    } catch (caught) {
      setError(operationFailed(caught));
    } finally {
      setBusy(false);
    }
  };

  const openFolder = async (path: string) => {
    setError(null);
    try {
      await invoke("replay_open_folder", { path });
    } catch (caught) {
      setError(operationFailed(caught));
    }
  };

  const showRevealResult = (result: RevealPathResult) => {
    if (!result.ok) {
      setError(
        t("replay.operationFailed", {
          reason: result.reason ?? "Failed to reveal path",
        }),
      );
    }
  };

  const revealExecutable = async (target: ReplayExecutableTarget) => {
    setError(null);
    try {
      const result = await invoke<RevealPathResult>(
        "replay_reveal_executable",
        { target },
      );
      showRevealResult(result);
    } catch (caught) {
      setError(operationFailed(caught));
    }
  };

  const removeFolder = async (path: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await invoke<ReplayLibrarySnapshot>("replay_remove_folder", {
        path,
      });
      setSnapshot(next);
    } catch (caught) {
      setError(operationFailed(caught));
    } finally {
      setBusy(false);
    }
  };

  const playReplay = async (entry: ReplayEntry) => {
    setError(null);
    try {
      await invoke("replay_play_entry", { path: entry.path });
    } catch (caught) {
      setError(operationFailed(caught));
    }
  };

  const revealReplay = async (entry: ReplayEntry) => {
    setError(null);
    try {
      const result = await invoke<RevealPathResult>("replay_reveal_entry", {
        path: entry.path,
      });
      showRevealResult(result);
    } catch (caught) {
      setError(operationFailed(caught));
    }
  };

  onMount(() => {
    void loadSnapshot();
  });

  onMount(() => {
    let disposed = false;
    const clearRefreshTimer = () => {
      if (lcuRefreshTimer === null) {
        return;
      }
      window.clearTimeout(lcuRefreshTimer);
      lcuRefreshTimer = null;
    };
    const scheduleRefresh = () => {
      clearRefreshTimer();
      lcuRefreshTimer = window.setTimeout(() => {
        lcuRefreshTimer = null;
        if (!disposed) {
          void refreshSnapshot();
        }
      }, LCU_REFRESH_DEBOUNCE_MS);
    };
    const unlisten = listen<LcuInstanceInfo[]>(
      "lcu-instances-changed",
      scheduleRefresh,
    );
    onCleanup(() => {
      disposed = true;
      clearRefreshTimer();
      unlisten.then((dispose) => dispose()).catch(() => {});
    });
  });

  onMount(() => {
    let disposed = false;
    let disposeDragDrop: (() => void) | null = null;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const payload = event.payload;
        const dropzone = dropzoneRef;

        if (!dropzone) {
          setDraggingFolder(false);
          return;
        }

        if (payload.type === "enter" || payload.type === "over") {
          setDraggingFolder(
            isPositionInsideElement(payload.position, dropzone),
          );
          return;
        }

        if (payload.type === "drop") {
          const inside = isPositionInsideElement(payload.position, dropzone);
          setDraggingFolder(false);
          if (inside && payload.paths[0]) {
            void addFolderPath(payload.paths[0]);
          }
          return;
        }

        setDraggingFolder(false);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }
        disposeDragDrop = unlisten;
      })
      .catch((caught) => {
        setError(operationFailed(caught));
      });

    onCleanup(() => {
      disposed = true;
      disposeDragDrop?.();
    });
  });

  return (
    <section class={s.root}>
      <header class={s.header}>
        <div class={s.titleGroup}>
          <span class={s.subtitle}>{t("replay.subtitle")}</span>
        </div>
        <AppTooltip content={t("replay.scanTooltip")}>
          {(triggerProps) => (
            <span
              {...triggerProps<HTMLSpanElement>({
                class: s.scanButtonTooltipTrigger,
              })}
            >
              <button
                type="button"
                class={s.scanButton}
                disabled={busy()}
                aria-label="Scan replay folders"
                onClick={() => {
                  void loadSnapshot("replay_scan_folders");
                }}
              >
                <RefreshCw
                  class={busy() ? s.spin : undefined}
                  size={14}
                  aria-hidden="true"
                />
                {t("replay.scan")}
              </button>
            </span>
          )}
        </AppTooltip>
      </header>

      <div class={s.layout}>
        <aside class={s.side}>
          <section class={s.panel}>
            <span class={s.panelTitle}>{t("replay.folders")}</span>
            <button
              ref={(element) => {
                dropzoneRef = element;
              }}
              type="button"
              class={cx(s.directoryDropzone, s.directoryTrigger)}
              disabled={busy()}
              data-dragging={draggingFolder() ? "" : undefined}
              aria-label="Choose replay folder"
              onClick={() => {
                void pickFolder();
              }}
            >
              <span class={s.resourceIconSlot}>
                <Upload size={14} aria-hidden="true" />
              </span>
              <span class={s.directoryText}>
                <span class={s.primaryText}>{t("replay.folderDropzone")}</span>
                <span class={s.dropzoneText}>ROFL</span>
              </span>
            </button>
            <div class={s.stack}>
              <Show when={initialLoading()}>
                <LoadingStatusRow
                  ariaLabel="Loading replay resources"
                  label={t("replay.loadingFolders")}
                />
              </Show>
              <Show when={!initialLoading()}>
                <Key each={folders()} by="path">
                  {(folder) => {
                    const removable = () => folderCanRemove(folder());
                    return (
                      <div class={s.resourceRow}>
                        <button
                          type="button"
                          class={s.folderOpenButton}
                          aria-label="Open replay folder"
                          disabled={!folder().exists}
                          onClick={() => {
                            void openFolder(folder().path);
                          }}
                        >
                          <span class={s.resourceIconSlot}>
                            <FolderOpen size={14} aria-hidden="true" />
                          </span>
                          <span class={s.resourceText}>
                            <AppTooltip content={folderTooltip(folder(), t)}>
                              {(triggerProps) => (
                                <span
                                  {...triggerProps<HTMLSpanElement>({
                                    class: s.primaryText,
                                  })}
                                >
                                  {folder().path}
                                </span>
                              )}
                            </AppTooltip>
                            <span class={s.mutedText}>
                              {folderStatusLabel(folder(), t)}
                            </span>
                          </span>
                        </button>
                        <Show
                          when={removable()}
                          fallback={
                            <span
                              class={s.resourceActionSlot}
                              aria-hidden="true"
                            />
                          }
                        >
                          <button
                            type="button"
                            class={s.smallButton}
                            aria-label="Remove replay folder"
                            disabled={busy()}
                            onClick={() => {
                              void removeFolder(folder().path);
                            }}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </Show>
                      </div>
                    );
                  }}
                </Key>
              </Show>
            </div>
          </section>

          <section class={s.panel}>
            <span class={s.panelTitle}>{t("replay.executables")}</span>
            <div class={s.stack}>
              <Show when={initialLoading()}>
                <LoadingStatusRow
                  ariaLabel="Loading replay resources"
                  label={t("replay.loadingExecutables")}
                />
              </Show>
              <Show
                when={!initialLoading() && executableResources().length === 0}
              >
                <span class={s.mutedText}>{t("replay.noExecutables")}</span>
              </Show>
              <Show when={!initialLoading()}>
                <Key each={executableResources()} by="id">
                  {(resource) => {
                    const reason = () => executableReason(resource());
                    const detailLabel = () =>
                      executableDetailLabel(resource(), t);
                    const executableTarget = () =>
                      executableRevealTarget(resource());
                    return (
                      <button
                        type="button"
                        class={cx(
                          s.executableOpenButton,
                          s.appearIn,
                          s.clientTone[familyTone(resource().family)],
                        )}
                        aria-label="Reveal League executable"
                        disabled={!executableTarget()}
                        onClick={() => {
                          const target = executableTarget();
                          if (target) {
                            void revealExecutable(target);
                          }
                        }}
                      >
                        <span class={s.resourceClientMain}>
                          <span class={s.resourceIconSlot}>
                            {resource().clients.length > 0 ? (
                              <Monitor size={14} aria-hidden="true" />
                            ) : (
                              <HardDrive size={14} aria-hidden="true" />
                            )}
                          </span>
                          <span class={s.resourceText}>
                            <span class={s.resourceTitleLine}>
                              <span
                                class={cx(
                                  s.familyBadge,
                                  s.familyBadgeTone[
                                    familyTone(resource().family)
                                  ],
                                )}
                              >
                                {familyLabel(resource().family)}
                              </span>
                              <span class={s.primaryText}>
                                League of Legends.exe
                              </span>
                            </span>
                            <span class={s.mutedText}>
                              {resource().gameVersion ??
                                t("replay.unknownVersion")}
                            </span>
                            <Show
                              when={
                                resource().gameExecutablePath ??
                                resource().gameBaseDir
                              }
                            >
                              {(path) => (
                                <AppTooltip content={path()}>
                                  {(triggerProps) => (
                                    <span
                                      {...triggerProps<HTMLSpanElement>({
                                        class: s.mutedText,
                                      })}
                                    >
                                      {path()}
                                    </span>
                                  )}
                                </AppTooltip>
                              )}
                            </Show>
                            <Show when={detailLabel()}>
                              {(label) => (
                                <span
                                  class={executableDetailClassName(resource())}
                                >
                                  {label()}
                                </span>
                              )}
                            </Show>
                            <Show when={reason()}>
                              {(currentReason) => (
                                <AppTooltip content={currentReason()}>
                                  {(triggerProps) => (
                                    <span
                                      {...triggerProps<HTMLSpanElement>({
                                        class: s.metaWarning,
                                      })}
                                    >
                                      {t(
                                        "replay.executableHint.clientUnavailable",
                                      )}
                                    </span>
                                  )}
                                </AppTooltip>
                              )}
                            </Show>
                          </span>
                        </span>
                        <span
                          class={cx(
                            s.statusBadge,
                            s.statusBadgeTone[executableStatusTone(resource())],
                          )}
                        >
                          {executableStatusLabel(resource(), t)}
                        </span>
                      </button>
                    );
                  }}
                </Key>
              </Show>
            </div>
          </section>
          <Show when={error()}>
            {(message) => <span class={s.error}>{message()}</span>}
          </Show>
        </aside>

        <section class={s.content}>
          <div class={s.searchRow}>
            <input
              class={s.input}
              value={query()}
              placeholder={t("replay.search")}
              onInput={(event) => setQuery(event.currentTarget.value)}
            />
          </div>

          <ScrollArea
            className={s.replayListScroller}
            contentClassName={s.replayList}
            direction="vertical"
            mode="outset"
            outsetWidth="16px"
          >
            <Show when={initialLoading()}>
              <LoadingStatusRow
                ariaLabel="Loading replay list"
                label={t("replay.loadingReplays")}
              />
            </Show>
            <Show when={!initialLoading() && entries().length === 0}>
              <div class={s.empty}>{t("replay.empty")}</div>
            </Show>
            <Show when={!initialLoading()}>
              <Key each={entries()} by="id">
                {(entry) => {
                  const championIcons = () =>
                    replayChampionIconItems(entry(), championCatalog());
                  return (
                    <article class={cx(s.replayRowShell, s.appearIn)}>
                      <button
                        type="button"
                        class={s.replayRow}
                        aria-label="Reveal replay file"
                        onClick={() => {
                          void revealReplay(entry());
                        }}
                      >
                        <span class={s.replayOpenContent}>
                          <span class={s.replayTitleLine}>
                            <span
                              class={cx(
                                s.familyBadge,
                                s.familyBadgeTone[familyTone(entry().family)],
                              )}
                            >
                              {familyLabel(entry().family)}
                            </span>
                            <span class={s.primaryText}>
                              {entry().fileName}
                            </span>
                          </span>
                          <span class={s.replayMeta}>
                            <span class={s.metaItem}>
                              {t("replay.gameId")}: {entry().gameId ?? "-"}
                            </span>
                            <span class={s.metaItem}>
                              {t("replay.platform")}:{" "}
                              {entry().platformId ?? "-"}
                            </span>
                            <Show
                              when={entry().metadataError}
                              fallback={
                                <span class={s.metaItem}>
                                  {t("replay.patch")}:{" "}
                                  {patchLabel(
                                    entry(),
                                    t("replay.unknownVersion"),
                                    t("replay.metadataFailed"),
                                  )}
                                </span>
                              }
                            >
                              {(metadataError) => (
                                <AppTooltip content={metadataError()}>
                                  {(triggerProps) => (
                                    <span
                                      {...triggerProps<HTMLSpanElement>({
                                        class: s.metaWarning,
                                      })}
                                    >
                                      {t("replay.patch")}:{" "}
                                      {patchLabel(
                                        entry(),
                                        t("replay.unknownVersion"),
                                        t("replay.metadataFailed"),
                                      )}
                                    </span>
                                  )}
                                </AppTooltip>
                              )}
                            </Show>
                            <span class={s.metaItem}>
                              {t("replay.size")}:{" "}
                              {formatBytes(entry().fileSizeBytes)}
                            </span>
                            <span class={s.metaItem}>
                              {t("replay.modified")}:{" "}
                              {formatDate(entry().modifiedAtMs)}
                            </span>
                          </span>
                          <Show when={championIcons().length > 0}>
                            <span class={s.replayChampions}>
                              <Key each={championIcons()} by="key">
                                {(champion) => (
                                  <LazyImage
                                    src={champion().src}
                                    alt={champion().alt}
                                    className={s.replayChampionIcon}
                                    fallbackClassName={s.replayChampionFallback}
                                  />
                                )}
                              </Key>
                            </span>
                          </Show>
                        </span>
                        <span class={s.replayActionSpace} aria-hidden="true" />
                      </button>
                      <AppTooltip content={playTooltip(entry(), t)}>
                        {(triggerProps) => (
                          <span
                            {...triggerProps<HTMLSpanElement>({
                              class: s.replayPlayButton,
                            })}
                          >
                            <button
                              type="button"
                              class={cx(
                                s.smallButton,
                                s.playButtonTone[
                                  familyTone(
                                    entry().launchAvailability.clientFamily,
                                  )
                                ],
                              )}
                              aria-label="Play replay"
                              disabled={!entry().launchAvailability.canLaunch}
                              onClick={() => {
                                void playReplay(entry());
                              }}
                            >
                              <Play size={14} aria-hidden="true" />
                            </button>
                          </span>
                        )}
                      </AppTooltip>
                    </article>
                  );
                }}
              </Key>
            </Show>
          </ScrollArea>
        </section>
      </div>
    </section>
  );
}

export default ReplayRoute;
