import type { SgpServersConfig } from "@/bindings/sgp";

function normalizeServerId(serverId: string): string {
  return serverId.trim().toUpperCase();
}

function normalizeServerIds(serverIds: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of serverIds) {
    const normalized = normalizeServerId(raw);
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function tencentServerSet(config: SgpServersConfig): Set<string> {
  return new Set(
    normalizeServerIds(config.tencentServerSummonerInteroperability ?? []),
  );
}

function toTencentCanonicalServerId(
  serverId: string,
  tencentServers: Set<string>,
): string {
  const normalized = normalizeServerId(serverId);
  if (normalized.length === 0) {
    return normalized;
  }
  if (normalized.startsWith("TENCENT_")) {
    return normalized;
  }

  const prefixed = `TENCENT_${normalized}`;
  if (tencentServers.has(prefixed)) {
    return prefixed;
  }

  return normalized;
}

function isTencentServerId(
  serverId: string,
  tencentServers: Set<string>,
): boolean {
  const normalized = normalizeServerId(serverId);
  if (normalized.length === 0) {
    return false;
  }
  if (normalized.startsWith("TENCENT_")) {
    return true;
  }
  if (tencentServers.has(normalized)) {
    return true;
  }
  return tencentServers.has(`TENCENT_${normalized}`);
}

function resolveAvailableServerCodes(
  focusedServerCode: string | null,
  config: SgpServersConfig,
): string[] {
  if (!focusedServerCode) {
    return [];
  }

  const tencentServers = tencentServerSet(config);
  const canonicalFocused = toTencentCanonicalServerId(
    focusedServerCode,
    tencentServers,
  );

  if (isTencentServerId(canonicalFocused, tencentServers)) {
    return normalizeServerIds([
      canonicalFocused,
      ...(config.tencentServerSummonerInteroperability ?? []),
    ]);
  }

  // International servers: only the focused server (cross-region name search
  // is not supported by LCU, so offering other servers would be misleading).
  return [canonicalFocused];
}

function toTencentSubServerCode(serverCode: string): string | null {
  const normalized = normalizeServerId(serverCode);
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.startsWith("TENCENT_")) {
    const sub = normalized.slice("TENCENT_".length);
    return sub.length > 0 ? sub : null;
  }
  return null;
}

export type LeagueClientRegion = {
  focusedServerCode: string | null;
  availableServerCodes: string[];
  effectiveServerCode: string | null;
  focusedTencentSubServerCode: string | null;
  availableTencentSubServerCodes: string[];
  effectiveTencentSubServerCode: string | null;
};

export function resolveLeagueClientRegion({
  focusedServerId,
  selectedServerId,
  config,
}: {
  focusedServerId: string | null;
  selectedServerId: string;
  config: SgpServersConfig;
}): LeagueClientRegion {
  const tencentServers = tencentServerSet(config);
  const focusedServerCode = focusedServerId
    ? toTencentCanonicalServerId(focusedServerId, tencentServers)
    : null;
  const availableServerCodes = resolveAvailableServerCodes(
    focusedServerCode,
    config,
  );
  let effectiveServerCode: string | null = null;

  if (focusedServerCode) {
    if (availableServerCodes.length <= 1) {
      effectiveServerCode = focusedServerCode;
    } else {
      const normalizedSelected = toTencentCanonicalServerId(
        selectedServerId,
        tencentServers,
      );
      effectiveServerCode =
        normalizedSelected.length > 0 &&
        availableServerCodes.includes(normalizedSelected)
          ? normalizedSelected
          : focusedServerCode;
    }
  }

  return {
    focusedServerCode,
    availableServerCodes,
    effectiveServerCode,
    focusedTencentSubServerCode: focusedServerCode
      ? toTencentSubServerCode(focusedServerCode)
      : null,
    availableTencentSubServerCodes: availableServerCodes
      .map((serverCode) => toTencentSubServerCode(serverCode))
      .filter((serverCode): serverCode is string => serverCode !== null),
    effectiveTencentSubServerCode: effectiveServerCode
      ? toTencentSubServerCode(effectiveServerCode)
      : null,
  };
}
