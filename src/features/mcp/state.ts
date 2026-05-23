import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { createSignal } from "solid-js";
import type { McpServerStateDto, McpToolDto } from "@/bindings/mcp";

export const MCP_TOGGLE_SETTING_ID = "mcp.server.toggle";
export const MCP_PORT_SETTING_ID = "mcp.server.port";
export const MCP_DEFAULT_PORT = 31421;
const MCP_SERVER_STATE_CHANGED_EVENT = "mcp_server_state_changed";

const stoppedState: McpServerStateDto = {
  running: false,
  endpoint: null,
  clients: [],
  callRecords: [],
};

const [mcpServerStateSignal, setMcpServerState] =
  createSignal<McpServerStateDto>(stoppedState);
const [mcpToolsSignal, setMcpTools] = createSignal<McpToolDto[]>([]);
let stateSubscription: Promise<UnlistenFn> | null = null;

export const mcpServerState = mcpServerStateSignal;
export const mcpTools = mcpToolsSignal;

export async function refreshMcpServerState(): Promise<McpServerStateDto> {
  const next = await invoke<McpServerStateDto>("mcp_get_server_state");
  setMcpServerState(next);
  return next;
}

export async function refreshMcpTools(): Promise<McpToolDto[]> {
  const next = await invoke<McpToolDto[]>("mcp_list_tools");
  setMcpTools(next);
  return next;
}

export async function toggleMcpServer(): Promise<McpServerStateDto> {
  const next = await invoke<McpServerStateDto>("execute_setting_action", {
    id: MCP_TOGGLE_SETTING_ID,
  });
  setMcpServerState(next);
  return next;
}

export async function clearMcpCallRecords(): Promise<McpServerStateDto> {
  const next = await invoke<McpServerStateDto>("mcp_clear_call_records");
  setMcpServerState(next);
  return next;
}

export async function initializeMcpServerState(): Promise<void> {
  stateSubscription ??= listen<McpServerStateDto>(
    MCP_SERVER_STATE_CHANGED_EVENT,
    (event) => {
      setMcpServerState(event.payload);
    },
  );

  await Promise.all([refreshMcpServerState(), refreshMcpTools()]);
}

export async function disposeMcpServerState(): Promise<void> {
  const subscription = stateSubscription;
  stateSubscription = null;
  const unlisten = await subscription;
  unlisten?.();
  setMcpServerState(stoppedState);
  setMcpTools([]);
}
