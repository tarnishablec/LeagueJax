export type LcuMapAssetSource = {
  assets: Record<string, unknown>;
};

const MAP_ASSET_KEYS = [
  "game-select-icon-active",
  "game-select-icon-hover",
  "game-select-icon-disabled",
  "icon-v2",
  "icon",
] as const;

function normalizeAsset(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\\/g, "/").trim();
  return normalized.length > 0 ? normalized : null;
}

export function preferredLcuMapAsset(
  map: LcuMapAssetSource | null | undefined,
): string | null {
  if (!map) {
    return null;
  }

  for (const key of MAP_ASSET_KEYS) {
    const asset = normalizeAsset(map.assets[key]);
    if (asset) {
      return asset;
    }
  }

  for (const asset of Object.values(map.assets)) {
    const normalized = normalizeAsset(asset);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}
