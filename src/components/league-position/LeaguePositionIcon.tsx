import { assignInlineVars } from "@vanilla-extract/dynamic";
import * as s from "./LeaguePositionIcon.css";

const CDRAGON_POSITION_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions";

export type LeaguePosition =
  | "top"
  | "jungle"
  | "middle"
  | "bottom"
  | "utility"
  | "fill"
  | "none";

function iconUrl(position: LeaguePosition): string {
  if (position === "none") {
    return `${CDRAGON_POSITION_ICON_BASE}/icon-position-none-disabled.png`;
  }
  return `${CDRAGON_POSITION_ICON_BASE}/icon-position-${position}.png`;
}

export function normalizeLeaguePosition(
  position: string | null | undefined,
): LeaguePosition | null {
  const value = (position ?? "").trim().toUpperCase();
  if (!value) {
    return null;
  }

  if (value === "TOP") {
    return "top";
  }
  if (value === "JUNGLE" || value === "JG" || value === "JUG") {
    return "jungle";
  }
  if (value === "MIDDLE" || value === "MID") {
    return "middle";
  }
  if (value === "BOTTOM" || value === "BOT" || value === "ADC") {
    return "bottom";
  }
  if (value === "UTILITY" || value === "SUPPORT" || value === "SUP") {
    return "utility";
  }
  if (value === "FILL") {
    return "fill";
  }
  if (value === "NONE") {
    return "none";
  }

  return null;
}

export function LeaguePositionIcon({
  position,
  width = 16,
  height = 16,
  emphasis = "strong",
}: {
  position: string | null | undefined;
  width?: number;
  height?: number;
  emphasis?: "strong" | "subtle";
}) {
  const normalized = normalizeLeaguePosition(position);
  if (!normalized) {
    return null;
  }

  return (
    <img
      className={s.icon({ emphasis })}
      style={assignInlineVars({
        [s.iconWidthVar]: `${width}px`,
        [s.iconHeightVar]: `${height}px`,
      })}
      src={iconUrl(normalized)}
      alt={`position-${normalized}`}
    />
  );
}

export function LeaguePositionPair({
  assigned,
  primary,
  secondary,
  assignedWidth = 16,
  assignedHeight = 16,
  preferenceWidth = 12,
  preferenceHeight = 12,
}: {
  assigned: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  assignedWidth?: number;
  assignedHeight?: number;
  preferenceWidth?: number;
  preferenceHeight?: number;
}) {
  const assignedIcon = normalizeLeaguePosition(assigned);
  const primaryIcon = normalizeLeaguePosition(primary);
  const secondaryIcon = normalizeLeaguePosition(secondary);

  const prefs: Array<{
    key: "primary" | "secondary";
    value: LeaguePosition;
  }> = [];
  if (primaryIcon && primaryIcon !== "none") {
    prefs.push({ key: "primary", value: primaryIcon });
  }
  if (secondaryIcon && secondaryIcon !== "none") {
    prefs.push({ key: "secondary", value: secondaryIcon });
  }

  const hasAssignedIcon = assignedIcon !== null && assignedIcon !== "none";

  return (
    <div
      className={s.pair}
      style={assignInlineVars({
        [s.pairMinHeightVar]: `${assignedHeight}px`,
      })}
    >
      {hasAssignedIcon && assignedIcon ? (
        <img
          className={s.icon({ emphasis: "strong" })}
          style={assignInlineVars({
            [s.iconWidthVar]: `${assignedWidth}px`,
            [s.iconHeightVar]: `${assignedHeight}px`,
          })}
          src={iconUrl(assignedIcon)}
          alt={`position-assigned-${assignedIcon}`}
        />
      ) : null}
      {prefs.length > 0 ? (
        <div className={s.prefGroup}>
          {prefs.map((item) => (
            <img
              key={item.key}
              className={s.icon({ emphasis: "subtle" })}
              style={assignInlineVars({
                [s.iconWidthVar]: `${preferenceWidth}px`,
                [s.iconHeightVar]: `${preferenceHeight}px`,
              })}
              src={iconUrl(item.value)}
              alt={`position-pref-${item.value}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
