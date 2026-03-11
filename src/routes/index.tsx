import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "../styles/shared.css";

function Dashboard() {
  return <div className={pageTitle}>Dashboard</div>;
}

export const Route = createFileRoute("/")({ component: Dashboard });
