import type { WebShard } from "@/runtime/web-contract";
import { I18nShard } from "./i18n/manifest";
import { MiniOngoingGameShard } from "./mini/mini-ongoing-game-shard";
import { MiniRuntimeShard } from "./mini/mini-runtime-shard";
import { initializeWebShards } from "./registry";
import { MiniSettingsShard } from "./settings/mini-settings-shard";
import { StaticCacheShard } from "./static-cache/manifest";
import { WindowEffectShard } from "./window-effect/manifest";

export function createMiniWebShards(): WebShard[] {
  return [
    new MiniSettingsShard(),
    new WindowEffectShard(),
    new I18nShard(),
    new StaticCacheShard(),
    new MiniRuntimeShard(),
    new MiniOngoingGameShard(),
  ];
}

export function initializeMiniWebShards(): Promise<void> {
  return initializeWebShards(createMiniWebShards());
}
