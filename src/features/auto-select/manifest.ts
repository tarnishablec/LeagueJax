import { Target } from "lucide-react";
import type { WebShard } from "../../types/web-shard";
import { SHARD_IDS } from "../shard-ids";

export const autoSelectShard: WebShard = {
	id: () => SHARD_IDS.AUTO_SELECT,
	navItems: () => [
		{
			to: "/auto-select",
			labelKey: "nav.autoSelect",
			icon: Target,
			section: "main",
			order: 20,
		},
	],
};
