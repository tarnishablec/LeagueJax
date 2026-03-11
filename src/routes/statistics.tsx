import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "../styles/shared.css";

function Statistics() {
  return <div className={pageTitle}>Statistics</div>;
}

export const Route = createFileRoute("/statistics")({ component: Statistics });
