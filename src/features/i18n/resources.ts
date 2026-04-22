import type { Resource } from "i18next";
import { entries, mergeDeep } from "remeda";
import type { WebShard } from "@/runtime/web-contract";

export function collectI18nResources(shards: readonly WebShard[]): Resource {
  const merged: Resource = {};

  for (const shard of shards) {
    const resources = shard.i18nResources?.();
    if (!resources) {
      continue;
    }

    for (const [locale, bundle] of entries(resources)) {
      const localeTarget = merged[locale] ?? {};
      merged[locale] = mergeDeep(localeTarget, bundle);
    }
  }

  return merged;
}
