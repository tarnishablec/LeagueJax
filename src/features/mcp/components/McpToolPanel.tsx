/** @jsxImportSource solid-js */
import {
  Activity,
  Check,
  Copy,
  Power,
  PowerOff,
  Server,
  ShieldCheck,
  Trash2,
  WifiOff,
  Wrench,
} from "lucide-solid";
import type { JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { McpCallRecordDto, McpToolDto } from "@/bindings/mcp";
import { FadingLabel } from "@/components/FadingLabel";
import { useSolidSettings } from "@/features/settings/solid-context";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
import { createLogger } from "@/infra/logger";
import {
  clearMcpCallRecords,
  MCP_DEFAULT_PORT,
  MCP_PORT_SETTING_ID,
  mcpServerState,
  mcpTools,
  refreshMcpTools,
  toggleMcpServer,
} from "../state";
import * as s from "./McpToolPanel.css";

const logger = createLogger("solid-mcp-tools");
const MCP_MIN_PORT = 1;
const MCP_MAX_PORT = 65535;

type ToggleIntent = "start" | "stop";

function endpointForPort(port: number): string {
  return `http://127.0.0.1:${port}/mcp`;
}

function portFromEndpoint(endpoint: string | null): string | null {
  return endpoint?.match(/^http:\/\/127\.0\.0\.1:(\d+)\/mcp$/)?.[1] ?? null;
}

function parsePortInput(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const port = Number.parseInt(value, 10);
  if (port < MCP_MIN_PORT || port > MCP_MAX_PORT) {
    return null;
  }

  return port;
}

function formatTimestamp(timestampMs: number, language: string): string {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString(language, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shortSessionId(sessionId: string): string {
  if (sessionId.length <= 14) {
    return sessionId;
  }

  return `${sessionId.slice(0, 10)}...`;
}

function EndpointCopyButton(props: { endpoint: string | null }): JSX.Element {
  const [copied, setCopied] = createSignal(false);
  let timer: number | null = null;

  onCleanup(() => {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  });

  const copyEndpoint = async () => {
    if (props.endpoint === null) {
      return;
    }

    try {
      await navigator.clipboard.writeText(props.endpoint);
      setCopied(true);
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        setCopied(false);
        timer = null;
      }, 1200);
    } catch (error) {
      logger.error({ error }, "Failed to copy MCP endpoint");
    }
  };

  return (
    <button
      type="button"
      class={s.endpointCopyButton}
      data-copied={copied()}
      aria-label="Copy MCP endpoint"
      title={props.endpoint ?? undefined}
      disabled={props.endpoint === null}
      onClick={() => {
        void copyEndpoint();
      }}
    >
      <span class={s.endpointIcon} aria-hidden="true">
        <span class={s.endpointIconLayer} data-slot="copy">
          <Copy size={14} />
        </span>
        <span class={s.endpointIconLayer} data-slot="check">
          <Check size={14} />
        </span>
      </span>
    </button>
  );
}

function EndpointEditor(props: {
  endpoint: string | null;
  portValue: string;
  disabled: boolean;
  invalid: boolean;
  onPortInput: (value: string) => void;
}): JSX.Element {
  const { t } = useSolidTranslation();

  return (
    <div
      class={s.endpointEditor}
      data-invalid={props.invalid}
      title={props.endpoint ?? t("mcp.tools.endpoint.portInvalid")}
    >
      <span class={s.endpointHostText}>127.0.0.1</span>
      <span class={s.endpointDivider} aria-hidden="true" />
      <input
        class={s.endpointPortInput}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={props.portValue}
        disabled={props.disabled}
        aria-label="MCP server port"
        aria-invalid={props.invalid}
        title={
          props.invalid
            ? t("mcp.tools.endpoint.portInvalid")
            : t("mcp.tools.endpoint.port")
        }
        onInput={(event) => {
          props.onPortInput(event.currentTarget.value);
        }}
      />
      <span class={s.endpointRouteText}>/mcp</span>
      <EndpointCopyButton endpoint={props.endpoint} />
    </div>
  );
}

function CallRecordRow(props: { record: McpCallRecordDto }): JSX.Element {
  const { language, t } = useSolidTranslation();

  return (
    <div class={s.callRow}>
      <span class={s.callIcon} aria-hidden="true">
        <Activity size={15} />
      </span>
      <div class={s.callMain}>
        <div class={s.callTitleLine}>
          <span class={s.callName}>
            {t("mcp.tools.calls.titleLine", {
              clientName: props.record.clientName,
              toolName: props.record.toolName,
            })}
          </span>
        </div>
        <div class={s.callMeta}>
          <span class={s.callMetaItem}>
            {t("mcp.tools.calls.calledAt", {
              time: formatTimestamp(props.record.calledAt, language()),
            })}
          </span>
          <span class={s.callMetaItem}>
            {t("mcp.tools.calls.clientVersion", {
              version: props.record.clientVersion,
            })}
          </span>
          <span
            class={s.callMetaItem}
            title={props.record.sessionId ?? undefined}
          >
            <Show
              when={props.record.sessionId}
              fallback={t("mcp.tools.calls.noSession")}
            >
              {(sessionId) =>
                t("mcp.tools.calls.session", {
                  sessionId: shortSessionId(sessionId()),
                })
              }
            </Show>
          </span>
          <span class={s.callMetaItem}>
            {t("mcp.tools.calls.protocol", {
              protocol: props.record.protocol,
              transport: props.record.transport,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

function hintBadgeLabel(
  value: boolean | null,
  enabledKey: string,
  disabledKey: string,
  t: (key: string) => string,
): string | null {
  if (value === null) {
    return null;
  }

  return value ? t(enabledKey) : t(disabledKey);
}

function ToolHintBadge(props: {
  label: string | null;
  tone: "safe" | "warning" | "muted";
}): JSX.Element {
  return (
    <Show when={props.label}>
      {(label) => (
        <span class={s.toolBadge} data-tone={props.tone}>
          {label()}
        </span>
      )}
    </Show>
  );
}

function ToolRow(props: { tool: McpToolDto }): JSX.Element {
  const { t } = useSolidTranslation();
  const description = createMemo(
    () => props.tool.description ?? t("mcp.tools.tools.noDescription"),
  );

  return (
    <div class={s.toolRow}>
      <span class={s.toolIcon} aria-hidden="true">
        <Wrench size={15} />
      </span>
      <div class={s.toolMain}>
        <div class={s.toolTitleLine}>
          <span class={s.toolName}>{props.tool.name}</span>
          <Show when={props.tool.title}>
            {(title) => <span class={s.toolTitle}>{title()}</span>}
          </Show>
        </div>
        <p class={s.toolDescription}>{description()}</p>
        <div class={s.toolMeta}>
          <ToolHintBadge
            label={hintBadgeLabel(
              props.tool.readOnlyHint,
              "mcp.tools.tools.readOnly",
              "mcp.tools.tools.writable",
              t,
            )}
            tone={props.tool.readOnlyHint === true ? "safe" : "warning"}
          />
          <ToolHintBadge
            label={hintBadgeLabel(
              props.tool.destructiveHint,
              "mcp.tools.tools.destructive",
              "mcp.tools.tools.nonDestructive",
              t,
            )}
            tone={props.tool.destructiveHint === true ? "warning" : "safe"}
          />
          <ToolHintBadge
            label={hintBadgeLabel(
              props.tool.idempotentHint,
              "mcp.tools.tools.idempotent",
              "mcp.tools.tools.nonIdempotent",
              t,
            )}
            tone="muted"
          />
          <ToolHintBadge
            label={hintBadgeLabel(
              props.tool.openWorldHint,
              "mcp.tools.tools.openWorld",
              "mcp.tools.tools.closedWorld",
              t,
            )}
            tone={props.tool.openWorldHint === true ? "warning" : "safe"}
          />
        </div>
      </div>
    </div>
  );
}

export function McpToolPanel(): JSX.Element {
  const { t } = useSolidTranslation();
  const settings = useSolidSettings();
  const configuredPort = useSolidSettingValue<number>(
    MCP_PORT_SETTING_ID,
    MCP_DEFAULT_PORT,
  );
  const [pendingIntent, setPendingIntent] = createSignal<ToggleIntent | null>(
    null,
  );
  const [clearingCalls, setClearingCalls] = createSignal(false);
  const [portDraft, setPortDraft] = createSignal(String(MCP_DEFAULT_PORT));
  const state = mcpServerState;
  const callRecords = createMemo(() => state().callRecords);
  const tools = createMemo(() => mcpTools());
  const pending = createMemo(() => pendingIntent() !== null);
  const parsedDraftPort = createMemo(() => parsePortInput(portDraft()));
  const endpoint = createMemo(() => {
    if (state().running) {
      return state().endpoint;
    }

    const port = parsedDraftPort();
    return port === null ? null : endpointForPort(port);
  });
  const portInvalid = createMemo(() => parsedDraftPort() === null);
  const actionLabel = createMemo(() => {
    const intent = pendingIntent();
    if (intent === "start") {
      return t("mcp.tools.action.starting");
    }
    if (intent === "stop") {
      return t("mcp.tools.action.stopping");
    }

    return state().running
      ? t("mcp.tools.action.stop")
      : t("mcp.tools.action.start");
  });

  createEffect(() => {
    if (state().running) {
      const runningPort = portFromEndpoint(state().endpoint);
      if (runningPort !== null) {
        setPortDraft(runningPort);
      }
      return;
    }

    setPortDraft(String(configuredPort() ?? MCP_DEFAULT_PORT));
  });

  onMount(() => {
    void refreshMcpTools().catch((error) => {
      logger.error({ error }, "Failed to refresh MCP tools");
    });
  });

  const runToggle = async () => {
    if (pending()) {
      return;
    }
    if (!state().running && portInvalid()) {
      return;
    }

    const intent: ToggleIntent = state().running ? "stop" : "start";
    setPendingIntent(intent);
    try {
      await toggleMcpServer();
    } catch (error) {
      logger.error({ error }, "Failed to toggle MCP server");
    } finally {
      setPendingIntent(null);
    }
  };

  const clearCalls = async () => {
    if (clearingCalls() || callRecords().length === 0) {
      return;
    }

    setClearingCalls(true);
    try {
      await clearMcpCallRecords();
    } catch (error) {
      logger.error({ error }, "Failed to clear MCP call records");
    } finally {
      setClearingCalls(false);
    }
  };

  return (
    <div class={s.root}>
      <div class={s.toolbar}>
        <div class={s.statusCluster} data-running={state().running}>
          <span class={s.statusIcon} aria-hidden="true">
            <Show when={state().running} fallback={<WifiOff size={17} />}>
              <Server size={17} />
            </Show>
          </span>
          <div class={s.statusMain}>
            <span class={s.statusText}>
              {state().running
                ? t("mcp.tools.status.running")
                : t("mcp.tools.status.stopped")}
            </span>
          </div>
        </div>

        <div class={s.serverControls}>
          <EndpointEditor
            endpoint={endpoint()}
            portValue={portDraft()}
            disabled={state().running || pending()}
            invalid={!state().running && portInvalid()}
            onPortInput={(value) => {
              setPortDraft(value);
              const port = parsePortInput(value);
              if (port !== null) {
                settings.set(MCP_PORT_SETTING_ID, port);
              }
            }}
          />
          <button
            type="button"
            class={s.actionButton}
            data-running={state().running}
            disabled={pending() || (!state().running && portInvalid())}
            aria-label="Toggle MCP server"
            onClick={() => {
              void runToggle();
            }}
          >
            <Show when={state().running} fallback={<Power size={15} />}>
              <PowerOff size={14} />
            </Show>
            <FadingLabel text={actionLabel()} />
          </button>
        </div>
      </div>

      <div class={s.main}>
        <div class={s.contentGrid}>
          <section class={s.toolsSection}>
            <div class={s.sectionHeader}>
              <ShieldCheck size={15} aria-hidden="true" />
              <span>{t("mcp.tools.tools.title")}</span>
              <span class={s.sectionCount}>{tools().length}</span>
            </div>

            <Show
              when={tools().length > 0}
              fallback={
                <div class={s.emptyState}>{t("mcp.tools.tools.empty")}</div>
              }
            >
              <div class={s.toolList}>
                <For each={tools()}>{(tool) => <ToolRow tool={tool} />}</For>
              </div>
            </Show>
          </section>

          <section class={s.callsSection}>
            <div class={s.sectionHeader}>
              <Activity size={15} aria-hidden="true" />
              <span>{t("mcp.tools.calls.title")}</span>
              <span class={s.sectionCount}>{callRecords().length}</span>
              <button
                type="button"
                class={s.headerActionButton}
                disabled={clearingCalls() || callRecords().length === 0}
                aria-label="Clear MCP call records"
                onClick={() => {
                  void clearCalls();
                }}
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>{t("mcp.tools.calls.clear")}</span>
              </button>
            </div>

            <Show
              when={callRecords().length > 0}
              fallback={
                <div class={s.emptyState}>{t("mcp.tools.calls.empty")}</div>
              }
            >
              <div class={s.callList}>
                <For each={callRecords()}>
                  {(record) => <CallRecordRow record={record} />}
                </For>
              </div>
            </Show>
          </section>
        </div>
      </div>
    </div>
  );
}
