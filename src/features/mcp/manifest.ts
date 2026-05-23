import { createLogger } from "@/infra/logger";
import type { Jax } from "@/jax";
import type {
  SolidToolbarSlot,
  SolidWebShard,
} from "@/runtime/solid-web-contract";
import { SolidSettingsShard } from "../settings/solid-settings-shard";
import { SHARD_IDS } from "../shard-ids";
import { McpServerStatusIcon } from "./components/McpServerStatusIcon";
import { mcpI18n } from "./i18n";
import { disposeMcpServerState, initializeMcpServerState } from "./state";

const MCP_SERVER_SECTION = "mcp.server" as const;
const logger = createLogger("solid-mcp-feature");

export class SolidMcpFeature implements SolidWebShard {
  public label() {
    return "SolidMcpFeature";
  }

  public id() {
    return SHARD_IDS.MCP;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public async setup(jax: Jax): Promise<void> {
    const settings = jax.getShard(SolidSettingsShard);
    settings.registerPage({ id: "mcp", order: 40 });
    settings.registerSection({
      key: MCP_SERVER_SECTION,
      order: 10,
    });

    try {
      await initializeMcpServerState();
    } catch (error) {
      logger.warn({ error }, "Failed to initialize MCP server state");
    }
  }

  public teardown(): void {
    void disposeMcpServerState().catch((error) => {
      logger.warn({ error }, "Failed to dispose MCP server state");
    });
  }

  public toolbarSlots(): SolidToolbarSlot[] {
    return [
      {
        id: "mcp-server-status",
        node: McpServerStatusIcon(),
        order: 93,
        routes: ["*"],
      },
    ];
  }

  public i18nResources() {
    return mcpI18n;
  }
}
