import React from "react";
import ReactDOM from "react-dom/client";
import { settingsApi } from "@/features/settings/store";
import {
  GENERAL_LANGUAGE_SETTING_ID,
  type Language,
} from "@/features/settings/store/general";
import "./styles/theme.css";
import "./styles/global.css";
import { initializeI18n } from "@/i18n";
import App from "./App";
import {
  getMergedI18nResources,
  initializeWebShards,
} from "./features/registry";

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById("root") as HTMLElement;
  const root = ReactDOM.createRoot(rootElement);

  try {
    await initializeWebShards();
    const language =
      settingsApi.get<Language>(GENERAL_LANGUAGE_SETTING_ID) ?? "zh-CN";
    await initializeI18n(getMergedI18nResources(), language);

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    console.error("[bootstrap] failed to initialize app", error);
    const message = error instanceof Error ? error.message : String(error);
    root.render(
      <pre style={{ padding: 16, whiteSpace: "pre-wrap" }}>
        {`App bootstrap failed:\n${message}`}
      </pre>,
    );
  }
}

void bootstrap();
