import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { SHARD_IDS } from "../shard-ids";
import { miniI18n } from "./i18n";

export class MiniRuntimeShard implements SolidWebShard {
  public label() {
    return "MiniRuntimeShard";
  }

  public id() {
    return SHARD_IDS.MINI;
  }

  public i18nResources() {
    return miniI18n;
  }
}
