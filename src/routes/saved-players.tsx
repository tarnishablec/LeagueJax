import { createFileRoute } from "@tanstack/react-router";

function SavedPlayers() {
	return <div className="text-xl font-semibold">Saved Players</div>;
}

export const Route = createFileRoute("/saved-players")({
	component: SavedPlayers,
});
