import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { I18nRuntimeShard } from "./i18n/runtime-shard";
import { MiniOngoingGameShard } from "./mini/mini-ongoing-game-shard";
import { MiniRuntimeShard } from "./mini/mini-runtime-shard";
import { MiniSettingsShard } from "./settings/mini-settings-shard";
import { initializeSolidWebShards } from "./solid-registry";
import { StaticCacheShard } from "./static-cache/manifest";
import { WindowEffectShard } from "./window-effect/manifest";

export function createSolidMiniWebShards(): SolidWebShard[] {
  return [
    new MiniSettingsShard(),
    new WindowEffectShard(),
    new I18nRuntimeShard(),
    new StaticCacheShard(),
    new MiniRuntimeShard(),
    new MiniOngoingGameShard(),
  ];
}

export function initializeSolidMiniWebShards(): Promise<void> {
  return initializeSolidWebShards(createSolidMiniWebShards());
}
