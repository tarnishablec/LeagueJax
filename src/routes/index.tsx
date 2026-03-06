import { createFileRoute } from "@tanstack/react-router";

function Dashboard() {
	return <div className="text-xl font-semibold">Dashboard</div>;
}

export const Route = createFileRoute("/")({ component: Dashboard });
