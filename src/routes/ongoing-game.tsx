import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "../styles/shared.css";

function OngoingGame() {
  return <div className={pageTitle}>Ongoing Game</div>;
}

export const Route = createFileRoute("/ongoing-game")({
  component: OngoingGame,
});
