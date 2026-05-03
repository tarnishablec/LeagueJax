import type { LeagueClientCmdArgs } from "@/bindings/lcu.ts";
import type { SgpServersConfig } from "@/bindings/sgp.ts";
import sgpServersConfigJson from "../../../../resources/league-servers.json";

const SGP_SERVERS_CONFIG: SgpServersConfig = sgpServersConfigJson;
const TENCENT_PREFIX = "TENCENT_";

const INTERNATIONAL_SERVER_LABELS: Record<string, string> = {
  BR1: "BR",
  EUW: "EUW",
  JP1: "JP",
  KR: "KR",
  LA1: "LAN",
  LA2: "LAS",
  NA1: "NA",
  OC1: "OCE",
  PBE: "PBE",
  PH2: "PH",
  RU: "RU",
  SG2: "SG",
  TH2: "TH",
  TR1: "TR",
  TW2: "TW",
  VN2: "VN",
};

const TENCENT_SERVER_LABEL_DEFAULTS: Record<string, string> = {
  TENCENT_HN1: "Ionia",
  TENCENT_HN10: "Black Rose",
  TENCENT_TJ100: "TENCENT 4",
  TENCENT_TJ101: "TENCENT 5",
  TENCENT_NJ100: "TENCENT 1",
  TENCENT_GZ100: "TENCENT 2",
  TENCENT_CQ100: "TENCENT 3",
  TENCENT_BGP2: "Super Server",
  TENCENT_PBE: "TENCENT PBE",
  TENCENT_PREPBE: "TENCENT PREPBE",
};

type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

function normalizeServerId(serverId: string | null | undefined): string | null {
  const normalized = serverId?.trim().toUpperCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function resolveKnownServerId(serverId: string): string {
  if (SGP_SERVERS_CONFIG.servers[serverId]) {
    return serverId;
  }

  if (!serverId.startsWith(TENCENT_PREFIX)) {
    const tencentServerId = `${TENCENT_PREFIX}${serverId}`;
    if (SGP_SERVERS_CONFIG.servers[tencentServerId]) {
      return tencentServerId;
    }
  }

  const matches = Object.keys(SGP_SERVERS_CONFIG.servers).filter(
    (candidate) =>
      !candidate.startsWith(TENCENT_PREFIX) && candidate.startsWith(serverId),
  );
  return matches.length === 1 ? matches[0] : serverId;
}

export function resolveHistoryServerId(
  serverId: string | null | undefined,
): string | null {
  const normalized = normalizeServerId(serverId);
  return normalized ? resolveKnownServerId(normalized) : null;
}

export function deriveSgpServerIdFromRegion(
  region: string | null | undefined,
): string | null {
  return resolveHistoryServerId(region);
}

export function deriveSgpServerIdFromClientArgs(
  cmdArgs: LeagueClientCmdArgs | null | undefined,
): string | null {
  if (!cmdArgs) {
    return null;
  }

  const region = normalizeServerId(cmdArgs.region);
  if (!region) {
    return null;
  }

  if (cmdArgs.family === "tencent") {
    const platformId = normalizeServerId(cmdArgs.rso_platform_id);
    if (platformId) {
      return resolveKnownServerId(`${TENCENT_PREFIX}${platformId}`);
    }
  }

  return resolveHistoryServerId(region);
}

export function formatHistoryServerBadgeLabel(
  serverId: string | null | undefined,
  t?: TranslateFn,
): string | null {
  const normalized = normalizeServerId(serverId);
  if (!normalized) {
    return null;
  }

  const knownServerId = resolveKnownServerId(normalized);
  if (knownServerId.startsWith(TENCENT_PREFIX)) {
    const fallback =
      TENCENT_SERVER_LABEL_DEFAULTS[knownServerId] ??
      knownServerId.slice(TENCENT_PREFIX.length);
    return t
      ? t(`history.serverLabels.${knownServerId}`, { defaultValue: fallback })
      : fallback;
  }

  return INTERNATIONAL_SERVER_LABELS[knownServerId] ?? knownServerId;
}
