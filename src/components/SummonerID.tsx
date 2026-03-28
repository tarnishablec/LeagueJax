import type { CSSProperties } from "react";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { vars } from "@/styles/theme.css.ts";

export type SummonerIDStyle = {
  gameName?: CSSProperties;
  tagLine?: CSSProperties;
};

export const SummonerID = ({
  summoner,
  styles,
}: {
  summoner: SummonerInfo;
  styles?: SummonerIDStyle;
}) => {
  return (
    <span
      style={{
        display: "grid",
        gridTemplateColumns: "min-content auto",
        alignItems: "center",
        justifyContent: "start",
        gap: 2,
      }}
    >
      <span
        style={{
          lineHeight: 1,
          fontWeight: 600,
          color: vars.color.foreground,
          overflow: "hidden",
          textOverflow: "ellipsis",
          ...styles?.gameName,
        }}
      >
        {summoner.gameName}
      </span>
      <span
        style={{
          lineHeight: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontWeight: 400,
          color: vars.color.mutedForeground,
          ...styles?.tagLine,
        }}
      >
        #{summoner.tagLine}
      </span>
    </span>
  );
};
