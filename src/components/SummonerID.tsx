/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { theme } from "@/styles/theme.css.ts";
import {
  summonerIdGameNameColorVar,
  summonerIdTagLineColorVar,
} from "./SummonerID.vars";

export { summonerIdGameNameColorVar, summonerIdTagLineColorVar };

export type SummonerIDStyle = {
  gameName?: JSX.CSSProperties;
  tagLine?: JSX.CSSProperties;
};

type SummonerIdentity = Pick<SummonerInfo, "gameName" | "tagLine">;

export function SummonerID(props: {
  summoner: SummonerIdentity;
  styles?: SummonerIDStyle;
}): JSX.Element {
  const tagLine = () => props.summoner.tagLine.trim();

  return (
    <span
      style={{
        display: "grid",
        "grid-template-columns": "max-content auto",
        "align-items": "center",
        "justify-content": "start",
        "text-box-trim": "trim-both",
        gap: "2px",
      }}
    >
      <span
        style={{
          "line-height": 1,
          "font-weight": 600,
          color: `var(${summonerIdGameNameColorVar}, ${theme.color.foreground})`,
          overflow: "hidden",
          "text-overflow": "ellipsis",
          "white-space": "nowrap",
          "text-box-trim": "trim-both",
          ...props.styles?.gameName,
        }}
      >
        {props.summoner.gameName}
      </span>
      <Show when={tagLine().length > 0}>
        <span
          style={{
            "line-height": 1,
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
            "font-weight": 400,
            color: `var(${summonerIdTagLineColorVar}, ${theme.color.mutedForeground})`,
            "text-box-trim": "trim-both",
            ...props.styles?.tagLine,
          }}
        >
          #{tagLine()}
        </span>
      </Show>
    </span>
  );
}
