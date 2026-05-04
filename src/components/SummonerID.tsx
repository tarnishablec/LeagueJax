import type { CSSProperties } from "react";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { theme } from "@/styles/theme.css.ts";

export const summonerIdGameNameColorVar = "--summoner-id-game-name-color";
export const summonerIdTagLineColorVar = "--summoner-id-tag-line-color";

export type SummonerIDStyle = {
  gameName?: CSSProperties;
  tagLine?: CSSProperties;
};

type SummonerIdentity = Pick<SummonerInfo, "gameName" | "tagLine">;

export const SummonerID = ({
  summoner,
  styles,
}: {
  summoner: SummonerIdentity;
  styles?: SummonerIDStyle;
}) => {
  const tagLine = summoner.tagLine.trim();

  return (
    <span
      style={{
        display: "grid",
        gridTemplateColumns: "max-content auto",
        alignItems: "center",
        justifyContent: "start",
        textBoxTrim: "trim-both",
        gap: 2,
      }}
    >
      <span
        style={{
          lineHeight: 1,
          fontWeight: 600,
          color: `var(${summonerIdGameNameColorVar}, ${theme.color.foreground})`,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textBoxTrim: "trim-both",
          ...styles?.gameName,
        }}
      >
        {summoner.gameName}
      </span>
      {tagLine.length > 0 ? (
        <span
          style={{
            lineHeight: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 400,
            color: `var(${summonerIdTagLineColorVar}, ${theme.color.mutedForeground})`,
            textBoxTrim: "trim-both",
            ...styles?.tagLine,
          }}
        >
          #{tagLine}
        </span>
      ) : null}
    </span>
  );
};
