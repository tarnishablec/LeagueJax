/** @jsxImportSource solid-js */
import type {
  SolidToolbarSlot,
  SolidWebShard,
} from "@/runtime/solid-web-contract";
import { SHARD_IDS } from "../shard-ids";
import { MiniWindowToggleButton } from "./components/MiniWindowToggleButton";
import { miniI18n } from "./i18n";

export class SolidMiniShard implements SolidWebShard {
  public label() {
    return "SolidMiniShard";
  }

  public id() {
    return SHARD_IDS.MINI;
  }

  public dependsOn() {
    return [];
  }

  public toolbarSlots(): SolidToolbarSlot[] {
    return [
      {
        id: "mini-window-toggle",
        node: <MiniWindowToggleButton />,
        order: 95,
        routes: ["*"],
      },
    ];
  }

  public i18nResources() {
    return miniI18n;
  }
}
