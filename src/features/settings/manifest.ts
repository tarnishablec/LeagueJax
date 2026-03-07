import { Settings } from "lucide-react";
import { shardId } from "@/types/shard-id.ts";
import type { WebShard } from "@/types/web-shard.ts";

// Settings is a core UI feature with no Rust shard counterpart
export const settingsShard: WebShard = {
	id: () => shardId("00000000-0000-4000-8000-000000000000"),
	navItems: () => [
		{
			to: "/settings",
			labelKey: "nav.settings",
			icon: Settings,
			section: "bottom",
			order: 0,
		},
	],
};
