import { BarChart3, Bot, Swords, Wrench } from "lucide-react";
import { shardId } from "../types/shard-id";
import type { NavItem, WebShard } from "../types/web-shard";
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
