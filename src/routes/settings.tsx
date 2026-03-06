import { createFileRoute } from "@tanstack/react-router";

function Settings() {
	return <div className="text-xl font-semibold">Settings</div>;
}

export const Route = createFileRoute("/settings")({ component: Settings });
