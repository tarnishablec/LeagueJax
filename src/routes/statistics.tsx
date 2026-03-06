import { createFileRoute } from "@tanstack/react-router";

function Statistics() {
	return <div className="text-xl font-semibold">Statistics</div>;
}

export const Route = createFileRoute("/statistics")({ component: Statistics });
