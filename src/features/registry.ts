import { BarChart3, Bot, Swords, Wrench } from "lucide-react";
import React from "react";
import { shardId } from "@/jax/shard/shard-id.ts";
import type { NavItem, ToolbarItem, WebShard } from "@/jax/shard/web-shard.ts";
import { settingsShard } from "./settings/manifest";

// ─── Core nav sections ────────────────────────────────────────────────────────
// These are UI-only grouping entries with no Rust shard counterpart.

const historyShard: WebShard = {
  id: () => shardId("00000000-0000-4000-8000-100000000001"),
  navItems: () => [
    {
      to: "/history",
      labelKey: "nav.history",
      icon: BarChart3,
      section: "main",
      order: 10,
    },
  ],
  toolbarItems: () => [
    {
      node: React.createElement(
        React.lazy(() =>
          import("./history/components/HistoryToolbar").then((m) => ({
            default: m.HistoryToolbar,
          })),
        ),
        { key: "history-search" },
      ),
      order: 10,
      routes: ["/history"],
    },
  ],
};

const gameShard: WebShard = {
  id: () => shardId("00000000-0000-4000-8000-100000000002"),
  navItems: () => [
    {
      to: "/game",
      labelKey: "nav.game",
      icon: Swords,
      section: "main",
      order: 20,
    },
  ],
};

const automationShard: WebShard = {
  id: () => shardId("00000000-0000-4000-8000-100000000003"),
  navItems: () => [
    {
      to: "/automation",
      labelKey: "nav.automation",
      icon: Bot,
      section: "main",
      order: 30,
    },
  ],
};

const toolsShard: WebShard = {
  id: () => shardId("00000000-0000-4000-8000-100000000004"),
  navItems: () => [
    {
      to: "/tools",
      labelKey: "nav.tools",
      icon: Wrench,
      section: "main",
      order: 40,
    },
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SHARD_REGISTRY: WebShard[] = [
  historyShard,
  gameShard,
  automationShard,
  toolsShard,
  settingsShard,
];

export function getNavItems(section: NavItem["section"] = "main"): NavItem[] {
  return SHARD_REGISTRY.flatMap((s) => s.navItems?.() ?? [])
    .filter((item) => (item.section ?? "main") === section)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getToolbarItems(currentRoute: string): ToolbarItem[] {
  return SHARD_REGISTRY.flatMap((s) => s.toolbarItems?.() ?? [])
    .filter(
      (item) =>
        !item.routes || item.routes.some((r) => currentRoute.startsWith(r)),
    )
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}
