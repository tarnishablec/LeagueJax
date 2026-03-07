import { cva } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { Moon, Sparkle, Sun } from "lucide-react";
import { cn } from "../lib/utils";
import { type Theme, useThemeStore } from "../stores/theme";

// ─── Config ───────────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; label: string; Icon: LucideIcon }[] = [
	{ value: "light", label: "Light", Icon: Sun },
	{ value: "system", label: "System", Icon: Sparkle },
	{ value: "dark", label: "Dark", Icon: Moon },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const dropdownItem = cva(
	"grid grid-cols-[1rem_1fr] items-center gap-2 w-full rounded px-2 py-1.5 text-xs transition-colors duration-100",
	{
		variants: {
			active: {
				true: "bg-accent text-accent-foreground",
				false:
					"text-muted-foreground hover:bg-accent hover:text-accent-foreground",
			},
		},
	},
);

// ─── Component ────────────────────────────────────────────────────────────────

export function ThemeToggle() {
	const { theme, setTheme } = useThemeStore();
	const current =
		THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[1];
	const CurrentIcon = current.Icon;

	return (
		<div className="group/theme relative h-full grid place-items-center">
			{/* Trigger */}
			<button
				type="button"
				aria-label={`Theme: ${current.label}`}
				className="grid place-items-center w-8 h-full text-foreground/60 hover:text-foreground transition-colors duration-100"
			>
				<CurrentIcon size={14} aria-hidden="true" />
			</button>

			{/* Dropdown — flush with the trigger so the hover area is continuous */}
			<div className="absolute top-full right-0 w-max pt-1 pointer-events-none opacity-0 group-hover/theme:pointer-events-auto group-hover/theme:opacity-100 transition-opacity duration-150 z-50">
				<div className="bg-background border border-border rounded-md shadow-md p-1 grid gap-0.5 min-w-[7rem]">
					{THEME_OPTIONS.map(({ value, label, Icon }) => (
						<button
							key={value}
							type="button"
							aria-label={label}
							aria-pressed={theme === value}
							className={cn(dropdownItem({ active: theme === value }))}
							onClick={() => setTheme(value)}
						>
							<Icon size={14} aria-hidden="true" />
							<span>{label}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
