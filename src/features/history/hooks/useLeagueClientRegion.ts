import { useMemo } from "react";
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

  if (!isTencentServerId(canonicalFocused, tencentServers)) {
    return [canonicalFocused];
  }

  return normalizeServerIds([
    canonicalFocused,
    ...(config.tencentServerSummonerInteroperability ?? []),
  ]);
}

type UseLeagueClientRegionParams = {
  focusedServerId: string | null;
  selectedServerId: string;
  config: SgpServersConfig;
};

type UseLeagueClientRegionResult = {
  focusedServerCode: string | null;
  availableServerCodes: string[];
  effectiveServerCode: string | null;
  focusedTencentSubServerCode: string | null;
  availableTencentSubServerCodes: string[];
  effectiveTencentSubServerCode: string | null;
};

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

export function useLeagueClientRegion({
  focusedServerId,
  selectedServerId,
  config,
}: UseLeagueClientRegionParams): UseLeagueClientRegionResult {
  const tencentServers = useMemo(() => tencentServerSet(config), [config]);

  const focusedServerCode = useMemo(() => {
    if (!focusedServerId) {
      return null;
    }
    return toTencentCanonicalServerId(focusedServerId, tencentServers);
  }, [focusedServerId, tencentServers]);

  const availableServerCodes = useMemo(
    () => resolveAvailableServerCodes(focusedServerCode, config),
    [focusedServerCode, config],
  );

  const effectiveServerCode = useMemo(() => {
    if (!focusedServerCode) {
      return null;
    }
    if (availableServerCodes.length <= 1) {
      return focusedServerCode;
    }

    const normalizedSelected = toTencentCanonicalServerId(
      selectedServerId,
      tencentServers,
    );
    if (
      normalizedSelected.length > 0 &&
      availableServerCodes.includes(normalizedSelected)
    ) {
      return normalizedSelected;
    }
    return focusedServerCode;
  }, [
    focusedServerCode,
    availableServerCodes,
    selectedServerId,
    tencentServers,
  ]);

  const focusedTencentSubServerCode = useMemo(
    () =>
      focusedServerCode ? toTencentSubServerCode(focusedServerCode) : null,
    [focusedServerCode],
  );

  const availableTencentSubServerCodes = useMemo(
    () =>
      availableServerCodes
        .map((serverCode) => toTencentSubServerCode(serverCode))
        .filter((serverCode): serverCode is string => serverCode !== null),
    [availableServerCodes],
  );

  const effectiveTencentSubServerCode = useMemo(
    () =>
      effectiveServerCode ? toTencentSubServerCode(effectiveServerCode) : null,
    [effectiveServerCode],
  );

  return {
    focusedServerCode,
    availableServerCodes,
    effectiveServerCode,
    focusedTencentSubServerCode,
    availableTencentSubServerCodes,
    effectiveTencentSubServerCode,
  };
}
