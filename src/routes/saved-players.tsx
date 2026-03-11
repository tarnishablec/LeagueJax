import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "../styles/shared.css";

function SavedPlayers() {
  return <div className={pageTitle}>Saved Players</div>;
}

export const Route = createFileRoute("/saved-players")({
  component: SavedPlayers,
});
