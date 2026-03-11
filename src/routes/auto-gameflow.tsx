import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "../styles/shared.css";

function AutoGameflow() {
  return <div className={pageTitle}>Auto Gameflow</div>;
}

export const Route = createFileRoute("/auto-gameflow")({
  component: AutoGameflow,
});
