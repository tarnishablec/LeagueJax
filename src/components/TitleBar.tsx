import { getCurrentWindow } from "@tauri-apps/api/window";
import { cva } from "class-variance-authority";
import React from "react";
import { cn } from "../lib/utils";

const appWindow = getCurrentWindow();

// ─── Icons ────────────────────────────────────────────────────────────────────

function MinimizeIcon() {
	return (
		<svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true">
			<path d="M0 0.5 H10" stroke="currentColor" strokeWidth="1" />
		</svg>
	);
}

function MaximizeIcon() {
	return (
		<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
			<rect
				x="0.5"
				y="0.5"
				width="9"
				height="9"
				fill="none"
				stroke="currentColor"
				strokeWidth="1"
			/>
		</svg>
	);
}

function CloseIcon() {
	return (
		<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
			<path
				d="M0 0 L10 10 M10 0 L0 10"
				stroke="currentColor"
				strokeWidth="1.2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const trafficButton = cva(
	"grid place-items-center w-11 h-full text-foreground/70 transition-colors duration-100 active:brightness-75",
	{
		variants: {
			variant: {
				/** Minimize / Maximize */
				default: [
					"hover:bg-[oklch(0_0_0/0.162)]",
					"dark:hover:bg-[oklch(1_0_0/0.2)]",
					"hover:text-foreground",
				],
				/** Close: Windows 11 red (#c42b1c ≈ oklch(0.47 0.2 26)) */
				close: ["hover:bg-[oklch(0.47_0.2_26)]", "hover:text-[oklch(1_0_0)]"],
			},
		},
		defaultVariants: { variant: "default" },
	},
);

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Slot for global app action buttons (e.g., announcements, background tasks). */
export function TitleBarToolbar({ children }: { children?: React.ReactNode }) {
	return (
		<div
			role="toolbar"
			aria-label="Application actions"
			className="grid auto-cols-auto grid-flow-col items-center"
		>
			{children}
		</div>
	);
}

// ─── TitleBar ─────────────────────────────────────────────────────────────────

export function TitleBar({ tools }: { tools?: React.ReactElement[] }) {
	return (
		<header className="grid grid-cols-[1fr_auto_auto_auto] h-10 select-none border-b bg-transparent shrink-0">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: OS-level drag region (≡ Electron's -webkit-app-region:drag). Keyboard users use the Maximize button. */}
			<div
				data-tauri-drag-region
				className="h-full"
				onDoubleClick={() => void appWindow.toggleMaximize()}
			></div>

			<TitleBarToolbar>
				{tools?.map((tool) => (
					<React.Fragment key={tool.key}>{tool}</React.Fragment>
				))}
			</TitleBarToolbar>

			<div aria-hidden="true" className="self-center h-4 w-px bg-border mx-1" />

			<div
				role="toolbar"
				aria-label="Window controls"
				className="grid grid-cols-3"
			>
				<button
					type="button"
					aria-label="Minimize"
					className={cn(trafficButton({ variant: "default" }))}
					onClick={() => void appWindow.minimize()}
				>
					<MinimizeIcon />
				</button>
				<button
					type="button"
					aria-label="Maximize / Restore"
					className={cn(trafficButton({ variant: "default" }))}
					onClick={() => void appWindow.toggleMaximize()}
				>
					<MaximizeIcon />
				</button>
				<button
					type="button"
					aria-label="Close"
					className={cn(trafficButton({ variant: "close" }))}
					onClick={() => void appWindow.close()}
				>
					<CloseIcon />
				</button>
			</div>
		</header>
	);
}
