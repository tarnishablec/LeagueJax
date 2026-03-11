import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "../styles/shared.css";

function AutoReply() {
  return <div className={pageTitle}>Auto Reply</div>;
}

export const Route = createFileRoute("/auto-reply")({ component: AutoReply });
