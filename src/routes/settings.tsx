import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "../styles/shared.css";

function Settings() {
  return <div className={pageTitle}>Settings</div>;
}

export const Route = createFileRoute("/settings")({ component: Settings });
