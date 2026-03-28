import React from "react";
import ReactDOM from "react-dom/client";
import { SettingsProvider } from "@/features/settings/context";
import { SettingsShard } from "@/features/settings/manifest";
import {
  type Language,
  SYSTEM_LANGUAGE_SETTING_ID,
} from "@/features/settings/store/general";
import "./styles/theme.css";
import "./styles/global.css";
import "react-loading-skeleton/dist/skeleton.css";
import { initializeI18n } from "@/i18n";
import App from "./App";
import {
  getJaxRuntime,
  getMergedI18nResources,
  initializeWebShards,
} from "./features/registry";
import { toErrorMessage } from "./infra/errors";
import { createLogger } from "./infra/logger";

const logger = createLogger("bootstrap");

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById("root") as HTMLElement;
  const root = ReactDOM.createRoot(rootElement);

  try {
    logger.info("Starting app bootstrap");
    await initializeWebShards();
    const settings = getJaxRuntime().getShard(SettingsShard);
    const language =
      settings.get<Language>(SYSTEM_LANGUAGE_SETTING_ID) ?? "zh-CN";
    logger.info({ language }, "Initializing i18n resources");
    await initializeI18n(getMergedI18nResources(), language);

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
