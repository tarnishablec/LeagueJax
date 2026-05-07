import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  FolderOpen,
  HardDrive,
  Monitor,
  Play,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu";
import type {
  ReplayClientFamily,
  ReplayEntry,
  ReplayExecutableTarget,
  ReplayFolder,
  ReplayLibrarySnapshot,
} from "@/bindings/replay";
import type { RevealPathResult } from "@/bindings/tauri_host";
import { AppTooltip } from "@/components/AppTooltip";
import { LazyImage } from "@/components/LazyImage";
import { ScrollArea } from "@/components/scroll-area";
import {
  type CdragonChampionCatalog,
  championAliasKey,
  useCdragonChampionCatalog,
} from "@/hooks/use-cdragon-champion-summary";
import * as s from "./ReplayRoute.css";

type FamilyTone = "tencent" | "riot" | "unknown";

const LCU_REFRESH_DEBOUNCE_MS = 180;
const CDRAGON_CHAMPION_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons";

type ReplayClientSnapshot = ReplayLibrarySnapshot["clients"][number];
type ReplayLocalInstallSnapshot = ReplayLibrarySnapshot["installs"][number];

type ExecutableResource = {
  id: string;
  family: ReplayClientFamily;
  gameVersion: string | null;
  gameExecutablePath: string | null;
  gameBaseDir: string | null;
  clients: ReplayClientSnapshot[];
};

function LoadingStatusRow({
  ariaLabel,
  label,
}: {
  ariaLabel: string;
  label: string;
}) {
  return (
    <div className={s.loadingStatusRow} role="status" aria-label={ariaLabel}>
      <RefreshCw
        className={`${s.loadingStatusIcon} ${s.spin}`}
        size={14}
        aria-hidden="true"
      />
      <span className={s.loadingLabel}>{label}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KB`;
  const mib = kib / 1024;
  if (mib < 1024) return `${mib.toFixed(1)} MB`;
  return `${(mib / 1024).toFixed(1)} GB`;
}

function formatDate(ms: number | null): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleString();
}

function entryChampionSearchText(
  entry: ReplayEntry,
  championCatalog: CdragonChampionCatalog,
): string {
  const aliasText = entry.championAliases
    .map((alias) => {
      const champion = championCatalog.byAlias[championAliasKey(alias)];
      return [
        alias,
        champion?.alias ?? "",
        champion?.name ?? "",
        champion?.id.toString() ?? "",
      ].join(" ");
    })
    .join(" ");

  return [entry.championIds.join(" "), aliasText].join(" ");
}

function entryMatches(
  entry: ReplayEntry,
  query: string,
  championCatalog: CdragonChampionCatalog,
): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [
    entry.fileName,
    entry.path,
    entry.platformId ?? "",
    entry.gameId?.toString() ?? "",
    entryChampionSearchText(entry, championCatalog),
    entry.patchVersion ?? "",
    entry.metadataError ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(normalized);
}

function patchLabel(
  entry: ReplayEntry,
  unknownLabel: string,
  failedLabel: string,
): string {
  if (entry.patchVersion) return entry.patchVersion;
  if (entry.metadataError) return failedLabel;
  return unknownLabel;
}

function familyLabel(family: ReplayClientFamily | null | undefined): string {
  return family ?? "-";
}

function familyTone(family: ReplayClientFamily | null | undefined): FamilyTone {
  switch (family) {
    case "TENCENT":
      return "tencent";
    case "RIOT":
      return "riot";
    default:
      return "unknown";
  }
}

function clientServerLabel(client: ReplayClientSnapshot) {
  return client.serverId ?? `Client #${client.pid}`;
}

function normalizeExecutablePathKey(path: string | null | undefined): string {
  if (!path) return "";
  let normalized = path.trim().replaceAll("/", "\\").toLocaleLowerCase();
  while (normalized.length > 3 && normalized.endsWith("\\")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function installMatchesClient(
  install: ReplayLocalInstallSnapshot,
  client: ReplayClientSnapshot,
): boolean {
  if (install.family !== client.family) {
    return false;
  }

  const installRoot = normalizeExecutablePathKey(install.gameBaseDir);
  const clientRoot = normalizeExecutablePathKey(client.installDir);
  if (!installRoot || !clientRoot) {
    return false;
  }

  return (
    clientRoot === installRoot ||
    clientRoot.startsWith(`${installRoot}\\`) ||
    installRoot.startsWith(`${clientRoot}\\`)
  );
}

function buildExecutableResources(
  snapshot: ReplayLibrarySnapshot | null,
): ExecutableResource[] {
  const installs = snapshot?.installs ?? [];
  const clients = snapshot?.clients ?? [];
  const matchedClientPids = new Set<number>();
  const resources: ExecutableResource[] = installs.map((install) => {
    const matchedClients = clients.filter((client) => {
      const matched = installMatchesClient(install, client);
      if (matched) {
        matchedClientPids.add(client.pid);
      }
      return matched;
    });

    return {
      id: `install:${normalizeExecutablePathKey(install.gameExecutablePath)}`,
      family: install.family,
      gameVersion:
        install.gameVersion ??
        matchedClients.find((client) => client.gameVersion)?.gameVersion ??
        null,
      gameExecutablePath: install.gameExecutablePath,
      gameBaseDir: install.gameBaseDir,
      clients: matchedClients,
    };
  });

  for (const client of clients) {
    if (matchedClientPids.has(client.pid)) {
      continue;
    }

    resources.push({
      id: `client:${client.pid}`,
      family: client.family,
      gameVersion: client.gameVersion,
      gameExecutablePath: null,
      gameBaseDir: client.installDir,
      clients: [client],
    });
  }

  return resources.sort(
    (left, right) =>
      familyLabel(left.family).localeCompare(familyLabel(right.family)) ||
      normalizeExecutablePathKey(left.gameBaseDir).localeCompare(
        normalizeExecutablePathKey(right.gameBaseDir),
      ),
  );
}

function executableStatusTone(
  resource: ExecutableResource,
): "running" | "local" {
  return resource.clients.length > 0 ? "running" : "local";
}

function executableStatusLabel(
  resource: ExecutableResource,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (resource.clients.length > 0) {
    return t("replay.executableStatus.running");
  }
  return t("replay.executableStatus.local");
}

function executableDetailLabel(
  resource: ExecutableResource,
  t: ReturnType<typeof useTranslation>["t"],
): string | null {
  if (resource.clients.length > 1) {
    return t("replay.executableHint.runningMultiple", {
      count: resource.clients.length,
    });
  }

  const client = resource.clients[0];
  if (client) {
    const server = clientServerLabel(client);
    const labelKey = resource.gameExecutablePath
      ? "replay.executableHint.runningServer"
      : "replay.executableHint.unmatchedRunning";
    return t(labelKey, {
      server,
      pid: client.pid,
    });
  }

  if (resource.family === "RIOT") {
    return t("replay.executableHint.riotRequiresRunningClient");
  }
  return null;
}

function executableRevealTarget(
  resource: ExecutableResource,
): ReplayExecutableTarget | null {
  if (!resource.gameExecutablePath && !resource.gameBaseDir) {
    return null;
  }

  return {
    family: resource.family,
    gameExecutablePath: resource.gameExecutablePath,
    gameBaseDir: resource.gameBaseDir,
    gameVersion: resource.gameVersion,
  };
}

function executableDetailClassName(resource: ExecutableResource): string {
  if (resource.family === "RIOT" && resource.clients.length === 0) {
    return s.tintText;
  }
  return s.mutedText;
}

function executableReason(resource: ExecutableResource): string | null {
  const reasons = resource.clients
    .map((client) => client.reason)
    .filter((reason): reason is string => Boolean(reason));
  if (reasons.length === 0) {
    return null;
  }
  return reasons.join("\n");
}

function folderCanRemove(folder: ReplayFolder): boolean {
  return (
    folder.sources.length > 0 &&
    folder.sources.every((source) => source.kind === "user")
  );
}

function folderSourceLabel(
  folder: ReplayFolder,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  const kinds = new Set(folder.sources.map((source) => source.kind));
  const labels: string[] = [];
  if (kinds.has("user")) labels.push(t("replay.folderSource.user"));
  if (kinds.has("client")) labels.push(t("replay.folderSource.client"));
  if (kinds.has("default")) labels.push(t("replay.folderSource.default"));
  return labels.join(" / ");
}

function folderStatusLabel(
  folder: ReplayFolder,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  const status = folder.exists ? t("replay.enabled") : t("replay.missing");
  const source = folderSourceLabel(folder, t);
  return source ? `${status} / ${source}` : status;
}

function folderTooltip(
  folder: ReplayFolder,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  const source = folderSourceLabel(folder, t);
  return source ? `${folder.path}\n${source}` : folder.path;
}

function launchUnavailableReason(
  reason: string | null,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (!reason) return t("replay.playTooltip.unavailable");

  if (reason === "Replay file name does not expose a game id") {
    return t("replay.playTooltip.reason.missingGameId");
  }
  if (
    reason === "No running League client was detected" ||
    reason === "No running League client detected"
  ) {
    return t("replay.playTooltip.reason.noRunningClient");
  }
  if (reason === "Replay file name does not expose a platform id") {
    return t("replay.playTooltip.reason.missingPlatformId");
  }
  if (reason === "Replay platform family could not be resolved") {
    return t("replay.playTooltip.reason.unknownFamily");
  }
  if (reason === "Replay metadata does not expose game version") {
    return t("replay.playTooltip.reason.missingVersion");
  }
  if (
    reason ===
    "No running League client or compatible local TENCENT install was detected"
  ) {
    return t("replay.playTooltip.reason.noRunningClientOrTencentInstall");
  }
  if (
    reason ===
    "No running RIOT client was detected; RIOT replays cannot use local executable fallback"
  ) {
    return t("replay.playTooltip.reason.riotLocalFallbackMissingClient");
  }

  const noFamilyClient = reason.match(
    /^No running (RIOT|TENCENT) client was detected$/,
  );
  if (noFamilyClient) {
    return t("replay.playTooltip.reason.missingFamilyClient", {
      family: noFamilyClient[1],
    });
  }

  const compatibleVersionMismatch = reason.match(
    /^No running (RIOT|TENCENT) client has a compatible version for replay version (.+)$/,
  );
  if (compatibleVersionMismatch) {
    return t("replay.playTooltip.reason.compatibleVersionMismatch", {
      family: compatibleVersionMismatch[1],
      version: compatibleVersionMismatch[2],
    });
  }

  const riotLocalFallbackUnsupported = reason.match(
    /^No running RIOT client has a compatible version for replay version (.+); RIOT replays cannot use local executable fallback$/,
  );
  if (riotLocalFallbackUnsupported) {
    return t("replay.playTooltip.reason.riotLocalFallbackUnsupported", {
      version: riotLocalFallbackUnsupported[1],
    });
  }

  const tencentClientOrInstallVersionMismatch = reason.match(
    /^No running TENCENT client or local install has a compatible version for replay version (.+)$/,
  );
  if (tencentClientOrInstallVersionMismatch) {
    return t(
      "replay.playTooltip.reason.tencentClientOrInstallVersionMismatch",
      {
        version: tencentClientOrInstallVersionMismatch[1],
      },
    );
  }

  const versionMismatch = reason.match(
    /^No running (RIOT|TENCENT) client for (.+) matches replay version (.+)$/,
  );
  if (versionMismatch) {
    return t("replay.playTooltip.reason.versionMismatch", {
      family: versionMismatch[1],
      server: versionMismatch[2],
      version: versionMismatch[3],
    });
  }

  return reason;
}

function playTooltip(
  entry: ReplayEntry,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (!entry.launchAvailability.canLaunch) {
    return launchUnavailableReason(entry.launchAvailability.reason, t);
  }

  if (entry.launchAvailability.launchMethod === "localExecutable") {
    return t("replay.playTooltip.localExecutable");
  }

  const client =
    entry.launchAvailability.clientServerId ??
    familyLabel(entry.launchAvailability.clientFamily);
  return t("replay.playTooltip.matched", {
    client,
  });
}

function championIconUrl(championId: number): string {
  return `${CDRAGON_CHAMPION_ICON_BASE}/${championId}.png`;
}

function replayChampionIconItems(
  entry: ReplayEntry,
  championCatalog: CdragonChampionCatalog,
) {
  const counts = new Map<string, number>();
  const fromAliases = entry.championAliases.flatMap((alias) => {
    const aliasKey = championAliasKey(alias);
    const champion = championCatalog.byAlias[aliasKey];
    if (!champion) {
      return [];
    }

    const count = (counts.get(aliasKey) ?? 0) + 1;
    counts.set(aliasKey, count);
    return {
      key: `${entry.id}-champion-${aliasKey}-${count}`,
      src: champion.src,
      alt: champion.name ?? champion.alias,
    };
  });

  if (fromAliases.length > 0) {
    return fromAliases;
  }

  return entry.championIds.map((championId) => {
    const key = championId.toString();
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return {
      key: `${entry.id}-champion-${championId}-${count}`,
      src: championIconUrl(championId),
      alt: `Champion ${championId}`,
    };
  });
}

function isPositionInsideElement(
  position: { x: number; y: number },
  element: HTMLElement,
): boolean {
  const scale = window.devicePixelRatio || 1;
  const x = position.x / scale;
  const y = position.y / scale;
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function ReplayRoute() {
  const { t } = useTranslation();
  const championCatalog = useCdragonChampionCatalog();
  const [snapshot, setSnapshot] = useState<ReplayLibrarySnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lcuRefreshTimerRef = useRef<number | null>(null);
  const dropzoneRef = useRef<HTMLButtonElement | null>(null);
  const [draggingFolder, setDraggingFolder] = useState(false);
  const initialLoading = busy && snapshot === null;

  const refreshSnapshot = useCallback(async () => {
    try {
      const next = await invoke<ReplayLibrarySnapshot>("replay_get_snapshot");
      setSnapshot(next);
    } catch (caught) {
      setError(t("replay.operationFailed", { reason: String(caught) }));
    }
  }, [t]);

  const loadSnapshot = useCallback(
    async (command = "replay_get_snapshot") => {
      setBusy(true);
      setError(null);
      try {
        const next = await invoke<ReplayLibrarySnapshot>(command);
        setSnapshot(next);
      } catch (caught) {
        setError(
          t("replay.operationFailed", {
            reason: String(caught),
          }),
        );
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    let disposed = false;

    const clearRefreshTimer = () => {
      if (lcuRefreshTimerRef.current === null) {
        return;
      }
      window.clearTimeout(lcuRefreshTimerRef.current);
      lcuRefreshTimerRef.current = null;
    };

    const scheduleRefresh = () => {
      clearRefreshTimer();
      lcuRefreshTimerRef.current = window.setTimeout(() => {
        lcuRefreshTimerRef.current = null;
        if (!disposed) {
          void refreshSnapshot();
        }
      }, LCU_REFRESH_DEBOUNCE_MS);
    };

    const unlisten = listen<LcuInstanceInfo[]>(
      "lcu-instances-changed",
      scheduleRefresh,
    );

    return () => {
      disposed = true;
      clearRefreshTimer();
      unlisten.then((dispose) => dispose());
    };
  }, [refreshSnapshot]);

  const entries = useMemo(
    () =>
      (snapshot?.entries ?? []).filter((entry) =>
        entryMatches(entry, query, championCatalog),
      ),
    [championCatalog, query, snapshot?.entries],
  );
  const folders = snapshot?.folders ?? [];
  const executableResources = useMemo(
    () => buildExecutableResources(snapshot),
    [snapshot],
  );

  const addFolderPath = useCallback(
    async (folderPath: string) => {
      setBusy(true);
      setError(null);
      try {
        const next = await invoke<ReplayLibrarySnapshot>("replay_add_folder", {
          path: folderPath,
        });
        setSnapshot(next);
      } catch (caught) {
        setError(t("replay.operationFailed", { reason: String(caught) }));
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

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
      setError(t("replay.operationFailed", { reason: String(caught) }));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let disposed = false;
    let disposeDragDrop: (() => void) | null = null;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const payload = event.payload;
        const dropzone = dropzoneRef.current;

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
        setError(t("replay.operationFailed", { reason: String(caught) }));
      });

    return () => {
      disposed = true;
      disposeDragDrop?.();
    };
  }, [addFolderPath, t]);

  const openFolder = async (path: string) => {
    setError(null);
    try {
      await invoke("replay_open_folder", { path });
    } catch (caught) {
      setError(t("replay.operationFailed", { reason: String(caught) }));
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
        {
          target,
        },
      );
      showRevealResult(result);
    } catch (caught) {
      setError(t("replay.operationFailed", { reason: String(caught) }));
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
      setError(t("replay.operationFailed", { reason: String(caught) }));
    } finally {
      setBusy(false);
    }
  };

  const playReplay = async (entry: ReplayEntry) => {
    setError(null);
    try {
      await invoke("replay_play_entry", { path: entry.path });
    } catch (caught) {
      setError(t("replay.operationFailed", { reason: String(caught) }));
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
      setError(t("replay.operationFailed", { reason: String(caught) }));
    }
  };

  return (
    <section className={s.root}>
      <header className={s.header}>
        <div className={s.titleGroup}>
          {/*<h1 className={s.title}>{t("replay.title")}</h1>*/}
          <span className={s.subtitle}>{t("replay.subtitle")}</span>
        </div>
        <AppTooltip content={t("replay.scanTooltip")}>
          <span className={s.scanButtonTooltipTrigger}>
            <button
              type="button"
              className={s.scanButton}
              disabled={busy}
              aria-label="Scan replay folders"
              onClick={() => {
                void loadSnapshot("replay_scan_folders");
              }}
            >
              <RefreshCw
                className={busy ? s.spin : undefined}
                size={14}
                aria-hidden="true"
              />
              {t("replay.scan")}
            </button>
          </span>
        </AppTooltip>
      </header>

      <div className={s.layout}>
        <aside className={s.side}>
          <section className={s.panel}>
            <span className={s.panelTitle}>{t("replay.folders")}</span>
            <button
              ref={dropzoneRef}
              type="button"
              className={`${s.directoryDropzone} ${s.directoryTrigger}`}
              disabled={busy}
              data-dragging={draggingFolder ? "" : undefined}
              aria-label="Choose replay folder"
              onClick={() => {
                void pickFolder();
              }}
            >
              <span className={s.resourceIconSlot}>
                <Upload size={14} aria-hidden="true" />
              </span>
              <span className={s.directoryText}>
                <span className={s.primaryText}>
                  {t("replay.folderDropzone")}
                </span>
                <span className={s.dropzoneText}>ROFL</span>
              </span>
            </button>
            <div className={s.stack}>
              {initialLoading ? (
                <LoadingStatusRow
                  ariaLabel="Loading replay resources"
                  label={t("replay.loadingFolders")}
                />
              ) : null}
              {!initialLoading &&
                folders.map((folder) => {
                  const removable = folderCanRemove(folder);
                  return (
                    <div key={folder.path} className={s.resourceRow}>
                      <button
                        type="button"
                        className={s.folderOpenButton}
                        aria-label="Open replay folder"
                        disabled={!folder.exists}
                        onClick={() => {
                          void openFolder(folder.path);
                        }}
                      >
                        <span className={s.resourceIconSlot}>
                          <FolderOpen size={14} aria-hidden="true" />
                        </span>
                        <span className={s.resourceText}>
                          <AppTooltip content={folderTooltip(folder, t)}>
                            <span className={s.primaryText}>{folder.path}</span>
                          </AppTooltip>
                          <span className={s.mutedText}>
                            {folderStatusLabel(folder, t)}
                          </span>
                        </span>
                      </button>
                      {removable ? (
                        <button
                          type="button"
                          className={s.smallButton}
                          aria-label="Remove replay folder"
                          disabled={busy}
                          onClick={() => {
                            void removeFolder(folder.path);
                          }}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      ) : (
                        <span
                          className={s.resourceActionSlot}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </section>

          <section className={s.panel}>
            <span className={s.panelTitle}>{t("replay.executables")}</span>
            <div className={s.stack}>
              {initialLoading ? (
                <LoadingStatusRow
                  ariaLabel="Loading replay resources"
                  label={t("replay.loadingExecutables")}
                />
              ) : null}
              {!initialLoading && executableResources.length === 0 ? (
                <span className={s.mutedText}>{t("replay.noExecutables")}</span>
              ) : null}
              {!initialLoading &&
                executableResources.map((resource) => {
                  const reason = executableReason(resource);
                  const detailLabel = executableDetailLabel(resource, t);
                  const executableTarget = executableRevealTarget(resource);
                  return (
                    <button
                      type="button"
                      key={resource.id}
                      className={`${s.executableOpenButton} ${s.appearIn} ${s.clientTone[familyTone(resource.family)]}`}
                      aria-label="Reveal League executable"
                      disabled={!executableTarget}
                      onClick={() => {
                        if (executableTarget) {
                          void revealExecutable(executableTarget);
                        }
                      }}
                    >
                      <span className={s.resourceClientMain}>
                        <span className={s.resourceIconSlot}>
                          {resource.clients.length > 0 ? (
                            <Monitor size={14} aria-hidden="true" />
                          ) : (
                            <HardDrive size={14} aria-hidden="true" />
                          )}
                        </span>
                        <span className={s.resourceText}>
                          <span className={s.resourceTitleLine}>
                            <span
                              className={`${s.familyBadge} ${s.familyBadgeTone[familyTone(resource.family)]}`}
                            >
                              {familyLabel(resource.family)}
                            </span>
                            <span className={s.primaryText}>
                              League of Legends.exe
                            </span>
                          </span>
                          <span className={s.mutedText}>
                            {resource.gameVersion ?? t("replay.unknownVersion")}
                          </span>
                          {(resource.gameExecutablePath ??
                          resource.gameBaseDir) ? (
                            <AppTooltip
                              content={
                                resource.gameExecutablePath ??
                                resource.gameBaseDir ??
                                ""
                              }
                            >
                              <span className={s.mutedText}>
                                {resource.gameExecutablePath ??
                                  resource.gameBaseDir}
                              </span>
                            </AppTooltip>
                          ) : null}
                          {detailLabel ? (
                            <span
                              className={executableDetailClassName(resource)}
                            >
                              {detailLabel}
                            </span>
                          ) : null}
                          {reason ? (
                            <AppTooltip content={reason}>
                              <span className={s.metaWarning}>
                                {t("replay.executableHint.clientUnavailable")}
                              </span>
                            </AppTooltip>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={`${s.statusBadge} ${s.statusBadgeTone[executableStatusTone(resource)]}`}
                      >
                        {executableStatusLabel(resource, t)}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
          {error ? <span className={s.error}>{error}</span> : null}
        </aside>

        <section className={s.content}>
          <div className={s.searchRow}>
            <input
              className={s.input}
              value={query}
              placeholder={t("replay.search")}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </div>

          <ScrollArea
            className={s.replayListScroller}
            contentClassName={s.replayList}
            direction="vertical"
            mode="outset"
            outsetWidth="16px"
          >
            {initialLoading ? (
              <LoadingStatusRow
                ariaLabel="Loading replay list"
                label={t("replay.loadingReplays")}
              />
            ) : null}
            {!initialLoading && entries.length === 0 ? (
              <div className={s.empty}>{t("replay.empty")}</div>
            ) : null}
            {!initialLoading &&
              entries.map((entry) => {
                const championIcons = replayChampionIconItems(
                  entry,
                  championCatalog,
                );
                return (
                  <article
                    key={entry.id}
                    className={`${s.replayRowShell} ${s.appearIn}`}
                  >
                    <button
                      type="button"
                      className={s.replayRow}
                      aria-label="Reveal replay file"
                      onClick={() => {
                        void revealReplay(entry);
                      }}
                    >
                      <span className={s.replayOpenContent}>
                        <span className={s.replayTitleLine}>
                          <span
                            className={`${s.familyBadge} ${s.familyBadgeTone[familyTone(entry.family)]}`}
                          >
                            {familyLabel(entry.family)}
                          </span>
                          <span className={s.primaryText}>
                            {entry.fileName}
                          </span>
                        </span>
                        <span className={s.replayMeta}>
                          <span className={s.metaItem}>
                            {t("replay.gameId")}: {entry.gameId ?? "-"}
                          </span>
                          <span className={s.metaItem}>
                            {t("replay.platform")}: {entry.platformId ?? "-"}
                          </span>
                          {entry.metadataError ? (
                            <AppTooltip content={entry.metadataError}>
                              <span className={s.metaWarning}>
                                {t("replay.patch")}:{" "}
                                {patchLabel(
                                  entry,
                                  t("replay.unknownVersion"),
                                  t("replay.metadataFailed"),
                                )}
                              </span>
                            </AppTooltip>
                          ) : (
                            <span className={s.metaItem}>
                              {t("replay.patch")}:{" "}
                              {patchLabel(
                                entry,
                                t("replay.unknownVersion"),
                                t("replay.metadataFailed"),
                              )}
                            </span>
                          )}
                          <span className={s.metaItem}>
                            {t("replay.size")}:{" "}
                            {formatBytes(entry.fileSizeBytes)}
                          </span>
                          <span className={s.metaItem}>
                            {t("replay.modified")}:{" "}
                            {formatDate(entry.modifiedAtMs)}
                          </span>
                        </span>
                        {championIcons.length > 0 ? (
                          <span className={s.replayChampions}>
                            {championIcons.map((champion) => (
                              <LazyImage
                                key={champion.key}
                                src={champion.src}
                                alt={champion.alt}
                                className={s.replayChampionIcon}
                                fallbackClassName={s.replayChampionFallback}
                              />
                            ))}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={s.replayActionSpace}
                        aria-hidden="true"
                      />
                    </button>
                    <AppTooltip content={playTooltip(entry, t)}>
                      <span className={s.replayPlayButton}>
                        <button
                          type="button"
                          className={`${s.smallButton} ${s.playButtonTone[familyTone(entry.launchAvailability.clientFamily)]}`}
                          aria-label="Play replay"
                          disabled={!entry.launchAvailability.canLaunch}
                          onClick={() => {
                            void playReplay(entry);
                          }}
                        >
                          <Play size={14} aria-hidden="true" />
                        </button>
                      </span>
                    </AppTooltip>
                  </article>
                );
              })}
          </ScrollArea>
        </section>
      </div>
    </section>
  );
}
