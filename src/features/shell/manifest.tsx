import { ClientStatus } from "@/components/ClientStatus";
import type {
  SidebarSlot,
  WebContribution,
} from "@/features/runtime/web-contract";
import en from "@/i18n/locales/en.json";
import zhCN from "@/i18n/locales/zh-CN.json";
import { SHARD_IDS } from "../shard-ids";

export class ShellShard implements WebContribution {
  public static readonly id = SHARD_IDS.SHELL;
  public static readonly dependsOn = [SHARD_IDS.SETTINGS];

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
      "zh-CN": zhCN,
    };
  }
}
