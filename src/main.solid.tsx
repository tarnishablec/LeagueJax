/** @jsxImportSource solid-js */
import { render } from "solid-js/web";
import { SolidSettingsProvider } from "@/features/settings/solid-context.solid";
import type { SettingsReader } from "@/features/settings/types";
import "./styles/theme.css";
import "./styles/global.css";
import App from "./App";
import { initializeSolidMainWebShards } from "./features/main-registry";
import { SHARD_IDS } from "./features/shard-ids";
import { getSolidJaxRuntime } from "./features/solid-registry";
import { toErrorMessage } from "./infra/errors";
import { createLogger } from "./infra/logger";

const logger = createLogger("solid-bootstrap");

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

  try {
    logger.info("Starting solid app bootstrap");
    await initializeSolidMainWebShards();
    const settings = getSolidJaxRuntime().getShardById(
      SHARD_IDS.SETTINGS,
    ) as unknown as SettingsReader;

    render(
      () => (
        <SolidSettingsProvider value={settings}>
          <App />
        </SolidSettingsProvider>
      ),
      rootElement,
    );
    logger.info("Solid app bootstrap completed");
  } catch (error) {
    logger.error({ error }, "Solid app bootstrap failed");
    const message = toErrorMessage(error);
    render(
      () => (
        <pre style={{ padding: "16px", "white-space": "pre-wrap" }}>
          {`Solid app bootstrap failed:\n${message}`}
        </pre>
      ),
      rootElement,
    );
  }
}

void bootstrap();
