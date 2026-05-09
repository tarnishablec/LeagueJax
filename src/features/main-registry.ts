import type { WebShard } from "@/runtime/web-contract";
import { AutomationShard } from "./automation/manifest";
import { HistoryShard } from "./history/manifest";
import { I18nShard } from "./i18n/manifest";
import { MiniShard } from "./mini/manifest";
import { OngoingGameShard } from "./ongoing-game/manifest";
import { initializeWebShards } from "./registry";
import { ReplayShard } from "./replay/manifest";
import { SettingsShard } from "./settings/manifest";
import { ShellShard } from "./shell/manifest";
import { StaticCacheShard } from "./static-cache/manifest";
import { ToolsShard } from "./tools/manifest";
import { TrayShard } from "./tray/manifest";
import { UpdaterFeature } from "./updater/manifest";
import { WindowEffectShard } from "./window-effect/manifest";

export function createMainWebShards(): WebShard[] {
  return [
    new SettingsShard(),
    new WindowEffectShard(),
    new I18nShard(),
    new UpdaterFeature(),
    new ShellShard(),
    new StaticCacheShard(),
    new TrayShard(),
    new MiniShard(),
    new HistoryShard(),
    new ReplayShard(),
    new OngoingGameShard(),
    new AutomationShard(),
    new ToolsShard(),
  ];
}

export function initializeMainWebShards(): Promise<void> {
  return initializeWebShards(createMainWebShards());
}
