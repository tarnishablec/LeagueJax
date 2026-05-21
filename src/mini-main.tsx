/** @jsxImportSource solid-js */
import { render } from "solid-js/web";
import { SolidSettingsProvider } from "@/features/settings/solid-context";
import type { SettingsReader } from "@/features/settings/types";
import "./styles/theme.css";
import "./styles/global.css";
import { initializeSolidMiniWebShards } from "./features/mini-registry";
import { SHARD_IDS } from "./features/shard-ids";
import { getSolidJaxRuntime } from "./features/solid-registry";
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

  try {
    logger.info("Starting mini app bootstrap");
    await initializeSolidMiniWebShards();
    const settings = getSolidJaxRuntime().getShardById(
      SHARD_IDS.SETTINGS,
    ) as unknown as SettingsReader;

    render(
      () => (
        <SolidSettingsProvider value={settings}>
          <MiniApp />
        </SolidSettingsProvider>
      ),
      rootElement,
    );
    logger.info("Mini app bootstrap completed");
  } catch (error) {
    logger.error({ error }, "Mini app bootstrap failed");
    const message = toErrorMessage(error);
    render(
      () => (
        <pre style={{ padding: "16px", "white-space": "pre-wrap" }}>
          {`Mini app bootstrap failed:\n${message}`}
        </pre>
      ),
      rootElement,
    );
  }
}

void bootstrap();
