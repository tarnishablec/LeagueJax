import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/theme.css";
import "./styles/global.css";
import { initializeI18n } from "@/i18n";
import App from "./App";
import {
  getMergedI18nResources,
  initializeWebShards,
} from "./features/registry";
import { useAppStore } from "./stores/app";

async function bootstrap(): Promise<void> {
  initializeWebShards();
  const { language } = useAppStore.getState();
  await initializeI18n(getMergedI18nResources(), language);

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
