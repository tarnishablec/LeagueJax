import React from "react";
import ReactDOM from "react-dom/client";
import { SettingsProvider } from "@/features/settings/context";
import type { SettingsReader } from "@/features/settings/types";
import "./styles/theme.css";
import "./styles/global.css";
import { initializeMiniWebShards } from "./features/mini-registry";
import { getJaxRuntime } from "./features/registry";
import { SHARD_IDS } from "./features/shard-ids";
import { toErrorMessage } from "./infra/errors";
import { createLogger } from "./infra/logger";
import MiniApp from "./MiniApp";

const logger = createLogger("mini-bootstrap");

function resolveUiPlatform(): string {
  const userAgent = navigator.userAgent;

  if (/\bWindows\b/i.test(userAgent)) {
    return "windows";
  }

  if (/\b(iPhone|iPad|iPod)\b/i.test(userAgent)) {
    return "ios";
  }

  if (/\bMacintosh\b/i.test(userAgent)) {
    return "macos";
  }

  if (/\bLinux\b/i.test(userAgent)) {
    return "linux";
  }

  return "unknown";
}

document.documentElement.dataset.platform = resolveUiPlatform();

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById("root") as HTMLElement;
  const root = ReactDOM.createRoot(rootElement);

  try {
    logger.info("Starting mini app bootstrap");
    await initializeMiniWebShards();
    const settings = getJaxRuntime().getShardById(
      SHARD_IDS.SETTINGS,
    ) as unknown as SettingsReader;

    root.render(
      <React.StrictMode>
        <SettingsProvider value={settings}>
          <MiniApp />
        </SettingsProvider>
      </React.StrictMode>,
    );
    logger.info("Mini app bootstrap completed");
  } catch (error) {
    logger.error({ error }, "Mini app bootstrap failed");
    const message = toErrorMessage(error);
    root.render(
      <pre style={{ padding: 16, whiteSpace: "pre-wrap" }}>
        {`Mini app bootstrap failed:\n${message}`}
      </pre>,
    );
  }
}

void bootstrap();
