/** @jsxImportSource solid-js */

import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";
import type { ScoreboardIconType } from "./ScoreboardIcon.types";

const CDRAGON_POSTGAME_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-postgame/global/default";

const CDRAGON_SCOREBOARD_ICON_BY_TYPE: Record<ScoreboardIconType, string> = {
  record: `${CDRAGON_POSTGAME_BASE}/scoreboard-kda-icon.svg`,
  kda: `${CDRAGON_POSTGAME_BASE}/scoreboard-row-stat-star-icon.svg`,
  gold: `${CDRAGON_POSTGAME_BASE}/scoreboard-coins-icon.svg`,
  cs: `${CDRAGON_POSTGAME_BASE}/scoreboard-stat-switcher-minions-slain.svg`,
  damage: `${CDRAGON_POSTGAME_BASE}/scoreboard-sword-icon.svg`,
};

function resolveScoreboardIconSrc(type: ScoreboardIconType): string {
  return CDRAGON_SCOREBOARD_ICON_BY_TYPE[type];
}

export function ScoreboardIcon(props: {
  type: ScoreboardIconType;
  className: string;
  fallbackClassName: string;
}): JSX.Element {
  const [errored, setErrored] = createSignal(false);

  return (
    <Show
      when={!errored()}
      fallback={<span class={props.fallbackClassName} aria-hidden="true" />}
    >
      <img
        src={resolveScoreboardIconSrc(props.type)}
        alt=""
        class={props.className}
        onError={() => setErrored(true)}
      />
    </Show>
  );
}
