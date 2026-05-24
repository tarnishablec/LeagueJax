import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { SolidAutomationShard } from "./automation/manifest";
import { SolidHistoryShard } from "./history/manifest";
import { I18nRuntimeShard } from "./i18n/runtime-shard";
import { SolidMcpFeature } from "./mcp/manifest";
import { SolidMiniShard } from "./mini/manifest";
import { SolidNotificationsShard } from "./notifications/manifest";
import { SolidOngoingGameShard } from "./ongoing-game/manifest";
import { SolidReplayShard } from "./replay/manifest";
import { SolidSettingsShard } from "./settings/solid-settings-shard";
import { SolidShellShard } from "./shell/manifest";
import { initializeSolidWebShards } from "./solid-registry";
import { StaticCacheShard } from "./static-cache/manifest";
import { SolidToolsShard } from "./tools/manifest";
import { SolidTrayShard } from "./tray/manifest";
import { SolidUpdaterFeature } from "./updater/manifest";
import { WindowEffectShard } from "./window-effect/manifest";

export function createSolidMainWebShards(): SolidWebShard[] {
  return [
    new SolidSettingsShard(),
    new SolidMcpFeature(),
    new WindowEffectShard(),
    new I18nRuntimeShard(),
    new SolidNotificationsShard(),
    new SolidUpdaterFeature(),
    new SolidShellShard(),
    new StaticCacheShard(),
    new SolidTrayShard(),
    new SolidMiniShard(),
    new SolidHistoryShard(),
    new SolidReplayShard(),
    new SolidOngoingGameShard(),
    new SolidAutomationShard(),
    new SolidToolsShard(),
  ];
}

async function createDevOnlySolidMainWebShards(): Promise<SolidWebShard[]> {
  if (!import.meta.env.DEV) {
    return [];
  }

  const { SolidDebugCommandShard } = await import("./debug/manifest");
  return [new SolidDebugCommandShard()];
}

export async function initializeSolidMainWebShards(): Promise<void> {
  const devOnlyShards = await createDevOnlySolidMainWebShards();
  return initializeSolidWebShards([
    ...createSolidMainWebShards(),
    ...devOnlyShards,
  ]);
}
