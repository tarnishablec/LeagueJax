import { FileUpload } from "@ark-ui/react/file-upload";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen, Play, RefreshCw, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReplayEntry, ReplayLibrarySnapshot } from "@/bindings/replay";
import { AppTooltip } from "@/components/AppTooltip";
import * as s from "./ReplayRoute.css";

type DirectoryUploadFile = File & {
  path?: string;
};

const EXECUTABLE_LOADING_ROW_KEYS = [
  "executable-loading-1",
  "executable-loading-2",
] as const;

const REPLAY_LOADING_ROW_KEYS = [
  "replay-loading-1",
  "replay-loading-2",
  "replay-loading-3",
] as const;

function LoadingResourceRow({ label }: { label: string }) {
  return (
    <div
      className={s.loadingResourceRow}
      role="status"
      aria-label="Loading replay resources"
    >
      <span className={s.loadingResourceMain}>
        <span className={s.loadingIcon} aria-hidden="true" />
        <span className={s.loadingTextStack}>
          <span className={s.loadingLabel}>{label}</span>
          <span className={s.loadingLineShort} />
        </span>
      </span>
      <span className={s.loadingAction} aria-hidden="true" />
    </div>
  );
}

function LoadingReplayRow({ label }: { label: string }) {
  return (
    <div
      className={s.loadingReplayRow}
      role="status"
      aria-label="Loading replay list"
    >
      <span className={s.loadingTextStack}>
        <span className={s.loadingLabel}>{label}</span>
        <span className={s.loadingLine} />
      </span>
      <span className={s.loadingAction} aria-hidden="true" />
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

function entryMatches(entry: ReplayEntry, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [
    entry.fileName,
    entry.path,
    entry.platformId ?? "",
    entry.gameId?.toString() ?? "",
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

function parentPath(path: string): string | null {
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  if (index <= 0) return null;
  return path.slice(0, index);
}

function inferUploadedDirectoryPath(files: File[]): string | null {
  for (const file of files) {
    const absolutePath = (file as DirectoryUploadFile).path;
    const relativePath = file.webkitRelativePath;
    if (!absolutePath || !relativePath) continue;

    const relativeSegments = relativePath.split(/[\\/]/).filter(Boolean);
    if (relativeSegments.length < 2) continue;

    let directoryPath: string | null = absolutePath;
    for (let index = 1; index < relativeSegments.length; index += 1) {
      directoryPath = parentPath(directoryPath);
      if (!directoryPath) return null;
    }
    return directoryPath;
  }

  return null;
}

export function ReplayRoute() {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<ReplayLibrarySnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoading = busy && snapshot === null;

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

  const entries = useMemo(
    () =>
      (snapshot?.entries ?? []).filter((entry) => entryMatches(entry, query)),
    [query, snapshot?.entries],
  );
  const folders = snapshot?.folders ?? [];
  const executables = snapshot?.executables ?? [];

  const addFolderFromFiles = async (files: File[]) => {
    const folderPath = inferUploadedDirectoryPath(files);
    if (!folderPath) {
      setError(t("replay.directoryPathUnavailable"));
      return;
    }

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
  };

  const openFolder = async (path: string) => {
    setError(null);
    try {
      await invoke("replay_open_folder", { path });
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
      await invoke("replay_reveal_entry", { path: entry.path });
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
      </header>

      <div className={s.layout}>
        <aside className={s.side}>
          <section className={s.panel}>
            <span className={s.panelTitle}>{t("replay.folders")}</span>
            <FileUpload.Root
              accept={[".rofl"]}
              directory
              maxFiles={5000}
              disabled={busy}
              onFileAccept={(details) => {
                void addFolderFromFiles(details.files);
              }}
            >
              <FileUpload.Dropzone className={s.directoryDropzone}>
                <FileUpload.Trigger className={s.directoryTrigger}>
                  <span className={s.resourceIconSlot}>
                    <Upload size={14} aria-hidden="true" />
                  </span>
                  <span className={s.resourceText}>
                    <span className={s.primaryText}>
                      {t("replay.folderDropzone")}
                    </span>
                    <span className={s.dropzoneText}>ROFL</span>
                  </span>
                  <span className={s.resourceActionSlot} aria-hidden="true" />
                </FileUpload.Trigger>
              </FileUpload.Dropzone>
              <FileUpload.HiddenInput />
            </FileUpload.Root>
            <div className={s.stack}>
              {initialLoading ? (
                <LoadingResourceRow label={t("replay.loadingFolders")} />
              ) : null}
              {!initialLoading &&
                folders.map((folder) => (
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
                        <AppTooltip content={folder.path}>
                          <span className={s.primaryText}>{folder.path}</span>
                        </AppTooltip>
                        <span className={s.mutedText}>
                          {folder.exists
                            ? t("replay.enabled")
                            : t("replay.missing")}
                        </span>
                      </span>
                    </button>
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
                  </div>
                ))}
            </div>
          </section>

          <section className={s.panel}>
            <span className={s.panelTitle}>{t("replay.executables")}</span>
            <div className={s.stack}>
              {initialLoading
                ? EXECUTABLE_LOADING_ROW_KEYS.map((key) => (
                    <LoadingResourceRow
                      key={key}
                      label={t("replay.loadingExecutables")}
                    />
                  ))
                : null}
              {!initialLoading && executables.length === 0 ? (
                <span className={s.mutedText}>{t("replay.noExecutables")}</span>
              ) : null}
              {!initialLoading &&
                executables.map((executable) => (
                  <div key={executable.path} className={s.resourceRow}>
                    <span className={s.resourceText}>
                      <span className={s.primaryText}>{executable.label}</span>
                      <span className={s.mutedText}>
                        {executable.gameVersion ?? t("replay.unknownVersion")}
                      </span>
                      <AppTooltip content={executable.path}>
                        <span className={s.mutedText}>{executable.path}</span>
                      </AppTooltip>
                    </span>
                    <span className={s.mutedText}>
                      {executable.exists
                        ? t("replay.enabled")
                        : t("replay.missing")}
                    </span>
                  </div>
                ))}
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

          <div className={s.replayList}>
            {initialLoading
              ? REPLAY_LOADING_ROW_KEYS.map((key) => (
                  <LoadingReplayRow
                    key={key}
                    label={t("replay.loadingReplays")}
                  />
                ))
              : null}
            {!initialLoading && entries.length === 0 ? (
              <div className={s.empty}>{t("replay.empty")}</div>
            ) : null}
            {!initialLoading &&
              entries.map((entry) => (
                <article key={entry.id} className={s.replayRowShell}>
                  <button
                    type="button"
                    className={s.replayRow}
                    aria-label="Reveal replay file"
                    onClick={() => {
                      void revealReplay(entry);
                    }}
                  >
                    <span className={s.replayOpenContent}>
                      <span className={s.primaryText}>{entry.fileName}</span>
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
                          {t("replay.size")}: {formatBytes(entry.fileSizeBytes)}
                        </span>
                        <span className={s.metaItem}>
                          {t("replay.modified")}:{" "}
                          {formatDate(entry.modifiedAtMs)}
                        </span>
                      </span>
                    </span>
                    <span className={s.replayActionSpace} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${s.smallButton} ${s.replayPlayButton}`}
                    aria-label="Play replay"
                    disabled={!entry.launchAvailability.canLaunch}
                    onClick={() => {
                      void playReplay(entry);
                    }}
                  >
                    <Play size={14} aria-hidden="true" />
                  </button>
                </article>
              ))}
          </div>
        </section>
      </div>
    </section>
  );
}
