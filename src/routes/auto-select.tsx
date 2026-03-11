import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "../styles/shared.css";

function AutoSelect() {
  return <div className={pageTitle}>Auto Select</div>;
}

export const Route = createFileRoute("/auto-select")({ component: AutoSelect });
