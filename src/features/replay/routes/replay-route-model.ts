import type {
  ReplayClientFamily,
  ReplayEntry,
  ReplayExecutableTarget,
  ReplayFolder,
  ReplayLibrarySnapshot,
} from "@/bindings/replay";
import type { CdragonChampionCatalog } from "@/hooks/use-cdragon-champion-summary";
import { championAliasKey } from "@/hooks/use-cdragon-champion-summary";
import type { SolidTranslate } from "@/i18n/solid";

export type FamilyTone = "tencent" | "riot" | "unknown";

const CDRAGON_CHAMPION_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons";

type ReplayClientSnapshot = ReplayLibrarySnapshot["clients"][number];
type ReplayLocalInstallSnapshot = ReplayLibrarySnapshot["installs"][number];

export type ExecutableResource = {
  id: string;
  family: ReplayClientFamily;
  gameVersion: string | null;
  gameExecutablePath: string | null;
  gameBaseDir: string | null;
  clients: ReplayClientSnapshot[];
};

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

export function entryMatches(
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

export function patchLabel(
  entry: ReplayEntry,
  unknownLabel: string,
  failedLabel: string,
): string {
  if (entry.patchVersion) return entry.patchVersion;
  if (entry.metadataError) return failedLabel;
  return unknownLabel;
}

export function familyLabel(
  family: ReplayClientFamily | null | undefined,
): string {
  return family ?? "-";
}

export function familyTone(
  family: ReplayClientFamily | null | undefined,
): FamilyTone {
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

export function buildExecutableResources(
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

export function executableStatusTone(
  resource: ExecutableResource,
): "running" | "local" {
  return resource.clients.length > 0 ? "running" : "local";
}

export function executableStatusLabel(
  resource: ExecutableResource,
  t: SolidTranslate,
): string {
  if (resource.clients.length > 0) {
    return t("replay.executableStatus.running");
  }
  return t("replay.executableStatus.local");
}

export function executableDetailLabel(
  resource: ExecutableResource,
  t: SolidTranslate,
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

export function executableRevealTarget(
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

export function executableReason(resource: ExecutableResource): string | null {
  const reasons = resource.clients
    .map((client) => client.reason)
    .filter((reason): reason is string => Boolean(reason));
  if (reasons.length === 0) {
    return null;
  }
  return reasons.join("\n");
}

export function folderCanRemove(folder: ReplayFolder): boolean {
  return (
    folder.sources.length > 0 &&
    folder.sources.every((source) => source.kind === "user")
  );
}

function folderSourceLabel(folder: ReplayFolder, t: SolidTranslate): string {
  const kinds = new Set(folder.sources.map((source) => source.kind));
  const labels: string[] = [];
  if (kinds.has("user")) labels.push(t("replay.folderSource.user"));
  if (kinds.has("client")) labels.push(t("replay.folderSource.client"));
  if (kinds.has("default")) labels.push(t("replay.folderSource.default"));
  return labels.join(" / ");
}

export function folderStatusLabel(
  folder: ReplayFolder,
  t: SolidTranslate,
): string {
  const status = folder.exists ? t("replay.enabled") : t("replay.missing");
  const source = folderSourceLabel(folder, t);
  return source ? `${status} / ${source}` : status;
}

export function folderTooltip(folder: ReplayFolder, t: SolidTranslate): string {
  const source = folderSourceLabel(folder, t);
  return source ? `${folder.path}\n${source}` : folder.path;
}

function launchUnavailableReason(
  reason: string | null,
  t: SolidTranslate,
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

export function playTooltip(entry: ReplayEntry, t: SolidTranslate): string {
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

export function replayChampionIconItems(
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KB`;
  const mib = kib / 1024;
  if (mib < 1024) return `${mib.toFixed(1)} MB`;
  return `${(mib / 1024).toFixed(1)} GB`;
}

export function formatDate(ms: number | null): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleString();
}

export function isPositionInsideElement(
  position: { x: number; y: number },
  element: HTMLElement,
): boolean {
  const scale = window.devicePixelRatio || 1;
  const x = position.x / scale;
  const y = position.y / scale;
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
