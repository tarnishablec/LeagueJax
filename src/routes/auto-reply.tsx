import { createFileRoute } from "@tanstack/react-router";

function AutoReply() {
	return <div className="text-xl font-semibold">Auto Reply</div>;
}

export const Route = createFileRoute("/auto-reply")({ component: AutoReply });
