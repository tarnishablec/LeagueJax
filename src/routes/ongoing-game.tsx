import { createFileRoute } from "@tanstack/react-router";

function OngoingGame() {
	return <div className="text-xl font-semibold">Ongoing Game</div>;
}

export const Route = createFileRoute("/ongoing-game")({
	component: OngoingGame,
});
