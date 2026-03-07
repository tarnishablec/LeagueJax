import { Users } from "lucide-react";
import type { WebShard } from "@/types/web-shard.ts";
import { SHARD_IDS } from "../shard-ids";

export const savedPlayersShard: WebShard = {
	id: () => SHARD_IDS.SAVED_PLAYERS,
	navItems: () => [
		{
			to: "/saved-players",
			labelKey: "nav.savedPlayers",
			icon: Users,
			section: "main",
			order: 60,
		},
	],
};
