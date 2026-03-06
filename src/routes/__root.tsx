import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { useTranslation } from "react-i18next";
import { useLcuEvents } from "../hooks/use-lcu-events";
import { useLcuStore } from "../stores/lcu";

function RootLayout() {
	const { t } = useTranslation();
	const connected = useLcuStore((s) => s.connected);
	useLcuEvents();

	const navItems = [
		{ to: "/", label: t("nav.dashboard") },
		{ to: "/auto-select", label: t("nav.autoSelect") },
		{ to: "/auto-gameflow", label: t("nav.autoGameflow") },
		{ to: "/auto-reply", label: t("nav.autoReply") },
		{ to: "/ongoing-game", label: t("nav.ongoingGame") },
		{ to: "/saved-players", label: t("nav.savedPlayers") },
		{ to: "/statistics", label: t("nav.statistics") },
		{ to: "/settings", label: t("nav.settings") },
	] as const;

	return (
		<div className="flex h-screen bg-background text-foreground">
			<aside className="flex w-48 flex-col border-r">
				<div className="border-b p-4 text-sm font-semibold">LeagueJax</div>
				<nav className="flex-1 space-y-1 p-2">
					{navItems.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
							activeProps={{ className: "bg-accent font-medium" }}
						>
							{item.label}
						</Link>
					))}
				</nav>
				<div className="border-t p-3 text-xs text-muted-foreground">
					{connected ? (
						<span className="text-green-500">{t("common.connected")}</span>
					) : (
						<span>{t("common.disconnected")}</span>
					)}
				</div>
			</aside>
			<main className="flex-1 overflow-auto p-6">
				<Outlet />
			</main>
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</div>
	);
}

export const Route = createRootRoute({ component: RootLayout });
