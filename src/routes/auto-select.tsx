import { createFileRoute } from "@tanstack/react-router";

function AutoSelect() {
	return <div className="text-xl font-semibold">Auto Select</div>;
}

export const Route = createFileRoute("/auto-select")({ component: AutoSelect });
