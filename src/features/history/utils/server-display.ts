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

  return resolveKnownServerId(region);
}

export function formatHistoryServerBadgeLabel(
  serverId: string | null | undefined,
): string | null {
  const normalized = normalizeServerId(serverId);
  if (!normalized) {
    return null;
  }

  const knownServerId = resolveKnownServerId(normalized);
  if (knownServerId.startsWith(TENCENT_PREFIX)) {
    return (
      SGP_SERVERS_CONFIG.serverNames["zh-CN"]?.[knownServerId] ??
      SGP_SERVERS_CONFIG.serverNames.en?.[knownServerId] ??
      knownServerId.slice(TENCENT_PREFIX.length)
    );
  }

  return INTERNATIONAL_SERVER_LABELS[knownServerId] ?? knownServerId;
}
