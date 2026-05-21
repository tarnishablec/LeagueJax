import { entries, mergeDeep } from "remeda";
import type { LocaleResource } from "@/i18n/types";

type I18nResourceProvider = {
  i18nResources?(): LocaleResource;
};

export function collectI18nResources(
  shards: readonly I18nResourceProvider[],
): LocaleResource {
  const merged: LocaleResource = {};

  for (const shard of shards) {
    const resources = shard.i18nResources?.();
    if (!resources) {
      continue;
    }

    for (const [locale, bundle] of entries(resources)) {
      if (!bundle) {
        continue;
      }

      const localeTarget = merged[locale] ?? {};
      merged[locale] = mergeDeep(localeTarget, bundle);
    }
  }

  return merged;
}
