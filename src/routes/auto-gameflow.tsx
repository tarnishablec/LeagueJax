import { createFileRoute } from "@tanstack/react-router";

function AutoGameflow() {
	return <div className="text-xl font-semibold">Auto Gameflow</div>;
}

export const Route = createFileRoute("/auto-gameflow")({
	component: AutoGameflow,
});
