/**
 * LeagueJax app logo — Jax's helmet rendered in Akari's flat icon style.
 *
 * Design language (matches Akari):
 *  - Dark navy radial-gradient background, rounded-rect canvas
 *  - Single solid fill shape (warm amber-gold, Jax's signature colour)
 *  - Dark incised cut lines (same oklch family as background) for detail
 *  - No gradients, no outlines — purely flat fills + strokes
 *
 * Jax anatomy encoded:
 *  - Two swept-back fins (his iconic ear-guards)
 *  - Dome helmet body
 *  - Dark visor ellipse (no visible face — the classic Jax joke)
 *  - Two dome cut-arcs + neck-guard divider (Akari-style slashes)
 */

const GOLD = "var(--primary)";
const DARK = "oklch(0.14 0.07 290)";

export function JaxLogo({
	size = 32,
	className,
}: {
	size?: number;
	className?: string;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="LeagueJax"
			className={className}
		>
			<defs>
				{/* Background — same radial feel as Akari's navy gradient */}
				<radialGradient
					id="jax-bg"
					cx="38%"
					cy="32%"
					r="68%"
					gradientUnits="objectBoundingBox"
				>
					<stop offset="0%" stopColor="oklch(0.22 0.1 290)" />
					<stop offset="100%" stopColor="oklch(0.12 0.06 290)" />
				</radialGradient>
			</defs>

			{/* ── Background ── */}
			<rect width="100" height="100" rx="22" fill="url(#jax-bg)" />

			{/* ── Left swept-back fin ── */}
			<path
				d="M 21 52
           C 9 44 3 28 8 15
           C 11 7 17 9 20 18
           C 22 26 21 40 21 52 Z"
				fill={GOLD}
			/>

			{/* ── Right swept-back fin (mirror) ── */}
			<path
				d="M 79 52
           C 91 44 97 28 92 15
           C 89 7 83 9 80 18
           C 78 26 79 40 79 52 Z"
				fill={GOLD}
			/>

			{/* ── Main helmet dome + neck guard ── */}
			<path
				d="M 22 56
           C 17 31 27 11 50 11
           C 73 11 83 31 78 56
           C 77 70 69 79 55 83
           L 50 85 L 45 83
           C 31 79 23 70 22 56 Z"
				fill={GOLD}
			/>

			{/* ── Visor — dark, no visible face ── */}
			<ellipse cx="50" cy="51" rx="21" ry="13" fill={DARK} />

			{/* ── Incised cut — left dome arc (Akari-style slash) ── */}
			<path
				d="M 22 43 C 29 31 40 22 51 20"
				stroke={DARK}
				strokeWidth="4"
				strokeLinecap="round"
			/>

			{/* ── Incised cut — right dome arc ── */}
			<path
				d="M 78 43 C 71 31 60 22 49 20"
				stroke={DARK}
				strokeWidth="4"
				strokeLinecap="round"
			/>

			{/* ── Neck guard divider ── */}
			<path
				d="M 34 76 C 41 81 59 81 66 76"
				stroke={DARK}
				strokeWidth="3.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
