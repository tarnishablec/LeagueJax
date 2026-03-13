import type { SummonerInfo } from "@/bindings/summoner.ts";
import { vars } from "@/styles/theme.css.ts";

export const SummonerID = ({ summoner }: { summoner: SummonerInfo }) => {
  return (
    <span style={{ display: "inline-grid", gridAutoFlow: "column" }}>
      <span
        style={{
          fontWeight: 600,
          color: vars.color.foreground,
          overflow: "hidden",
          whiteSpace: "ellipsis",
        }}
      >
        {summoner.gameName}
      </span>
      <span
        style={{
          fontWeight: 400,
          color: vars.color.mutedForeground,
        }}
      >
        {" "}
        #{summoner.tagLine}
      </span>
    </span>
  );
};
