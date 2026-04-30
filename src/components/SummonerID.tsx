import type { CSSProperties } from "react";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { vars } from "@/styles/theme.css.ts";

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
          color: vars.color.foreground,
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
            color: vars.color.mutedForeground,
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
