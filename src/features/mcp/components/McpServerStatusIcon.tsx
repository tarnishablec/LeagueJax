/** @jsxImportSource solid-js */
import { useNavigate } from "@solidjs/router";
import { Server } from "lucide-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { AppTooltip } from "@/components/AppTooltip";
import { useSolidTranslation } from "@/i18n/solid";
import { mcpServerState } from "../state";
import * as s from "./McpServerStatusIcon.css";

export function McpServerStatusIcon(): JSX.Element {
  const { t } = useSolidTranslation();
  const navigate = useNavigate();

  return (
    <Show when={mcpServerState().running}>
      <AppTooltip
        content={t("mcp.toolbar.running", {
          endpoint: mcpServerState().endpoint ?? "-",
        })}
        placement="bottom"
      >
        {(triggerProps) => (
          <button
            {...triggerProps({
              type: "button",
              "aria-label": "MCP server running",
              class: s.trigger,
              onClick: () => {
                navigate("/main/tools/mcp");
              },
            })}
          >
            <Server size={14} aria-hidden="true" />
            <span class={s.dot} aria-hidden="true" />
          </button>
        )}
      </AppTooltip>
    </Show>
  );
}
