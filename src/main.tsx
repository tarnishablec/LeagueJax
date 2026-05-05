import React from "react";
import ReactDOM from "react-dom/client";
import { SettingsProvider } from "@/features/settings/context";
import { SettingsShard } from "@/features/settings/manifest";
import "./styles/theme.css";
import "./styles/global.css";
import "react-loading-skeleton/dist/skeleton.css";
import App from "./App";
import { getJaxRuntime, initializeWebShards } from "./features/registry";
import { toErrorMessage } from "./infra/errors";
import { createLogger } from "./infra/logger";

const logger = createLogger("bootstrap");

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
    logger.info("Starting app bootstrap");
    await initializeWebShards();
    const settings = getJaxRuntime().getShard(SettingsShard);

    root.render(
      <React.StrictMode>
        <SettingsProvider value={settings}>
          <App />
        </SettingsProvider>
      </React.StrictMode>,
    );
    logger.info("App bootstrap completed");
  } catch (error) {
    logger.error({ error }, "App bootstrap failed");
    const message = toErrorMessage(error);
    root.render(
      <pre style={{ padding: 16, whiteSpace: "pre-wrap" }}>
        {`App bootstrap failed:\n${message}`}
      </pre>,
    );
  }
}

void bootstrap();
