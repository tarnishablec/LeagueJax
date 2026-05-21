/** @jsxImportSource solid-js */
import { Key } from "@solid-primitives/keyed";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
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

export function LeaguePositionIcon(props: {
  position: string | null | undefined;
  width?: number;
  height?: number;
  emphasis?: "strong" | "subtle";
}): JSX.Element {
  const normalized = () => normalizeLeaguePosition(props.position);

  return (
    <Show when={normalized()}>
      {(position) => (
        <img
          class={s.icon({ emphasis: props.emphasis ?? "strong" })}
          style={assignInlineVars({
            [s.iconWidthVar]: `${props.width ?? 16}px`,
            [s.iconHeightVar]: `${props.height ?? 16}px`,
          })}
          src={iconUrl(position())}
          alt={`position-${position()}`}
        />
      )}
    </Show>
  );
}

export function LeaguePositionPair(props: {
  assigned: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  assignedWidth?: number;
  assignedHeight?: number;
  preferenceWidth?: number;
  preferenceHeight?: number;
}): JSX.Element {
  const assignedIcon = () => normalizeLeaguePosition(props.assigned);
  const primaryIcon = () => normalizeLeaguePosition(props.primary);
  const secondaryIcon = () => normalizeLeaguePosition(props.secondary);
  const prefs = () => {
    const items: Array<{
      key: "primary" | "secondary";
      value: LeaguePosition;
    }> = [];
    const primary = primaryIcon();
    const secondary = secondaryIcon();

    if (primary && primary !== "none") {
      items.push({ key: "primary", value: primary });
    }
    if (secondary && secondary !== "none") {
      items.push({ key: "secondary", value: secondary });
    }

    return items;
  };
  const hasAssignedIcon = () =>
    assignedIcon() !== null && assignedIcon() !== "none";

  return (
    <div
      class={s.pair}
      style={assignInlineVars({
        [s.pairMinHeightVar]: `${props.assignedHeight ?? 16}px`,
      })}
    >
      <Show when={hasAssignedIcon() && assignedIcon()}>
        {(position) => (
          <img
            class={s.icon({ emphasis: "strong" })}
            style={assignInlineVars({
              [s.iconWidthVar]: `${props.assignedWidth ?? 16}px`,
              [s.iconHeightVar]: `${props.assignedHeight ?? 16}px`,
            })}
            src={iconUrl(position())}
            alt={`position-assigned-${position()}`}
          />
        )}
      </Show>
      <Show when={prefs().length > 0}>
        <div class={s.prefGroup}>
          <Key each={prefs()} by="key">
            {(item) => (
              <img
                class={s.icon({ emphasis: "subtle" })}
                style={assignInlineVars({
                  [s.iconWidthVar]: `${props.preferenceWidth ?? 12}px`,
                  [s.iconHeightVar]: `${props.preferenceHeight ?? 12}px`,
                })}
                src={iconUrl(item().value)}
                alt={`position-pref-${item().value}`}
              />
            )}
          </Key>
        </div>
      </Show>
    </div>
  );
}
