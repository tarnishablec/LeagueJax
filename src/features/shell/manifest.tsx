import { ClientStatus } from "@/components/ClientStatus";
import en from "@/i18n/locales/en.json";
import jaJP from "@/i18n/locales/ja-JP.json";
import zhCN from "@/i18n/locales/zh-CN.json";
import type { SidebarSlot, WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";

export class ShellShard implements WebShard {
  public label() {
    return "ShellShard";
  }

  public id() {
    return SHARD_IDS.SHELL;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public sidebarSlots(): SidebarSlot[] {
    return [
      {
        id: "shell-client-status",
        order: 10,
        render: ({ collapsed, iconSize }) => (
          <ClientStatus collapsed={collapsed} iconSize={iconSize} />
        ),
      },
    ];
  }

  public i18nResources() {
    return {
      en,
      "ja-JP": jaJP,
      "zh-CN": zhCN,
    };
  }
}
