import type { LucideIcon } from "lucide-react";
import type React from "react";
import type { ShardId } from "./shard-id.ts";

export type NavSection = "main" | "bottom";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  section?: NavSection;
  order?: number;
}

export interface ToolbarItem {
  node: React.ReactElement;
  order?: number;
  /** Paths where this item appears. `undefined` = all routes. */
  routes?: string[];
}

/**
 * Web-side shard interface.
 * Each UI-contributing shard implements this and registers itself in the registry.
 */
export interface WebShard {
  id(): ShardId;

  navItems?(): NavItem[];

  toolbarItems?(): ToolbarItem[];
}
