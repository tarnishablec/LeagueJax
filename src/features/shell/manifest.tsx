import type { WebShard } from "@/jax/shard/web-shard.ts";
import { ClientStatus } from "@/components/ClientStatus.tsx";
import en from "@/i18n/locales/en.json";
import zhCN from "@/i18n/locales/zh-CN.json";
import { SHARD_IDS } from "../shard-ids";

export const shellShard: WebShard = {
  id: () => SHARD_IDS.SHELL,
  setupStores: () => {
    // No shell-local stores yet.
  },
  sidebarSlots: () => [
    {
      id: "shell-client-status",
      order: 10,
      render: ({ collapsed, iconSize }) => (
        <ClientStatus collapsed={collapsed} iconSize={iconSize} />
      ),
    },
  ],
  i18nResources: () => ({
    en,
    "zh-CN": zhCN,
  }),
};
