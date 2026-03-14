import type { SummonerInfo } from "@/bindings/summoner.ts";
import { vars } from "@/styles/theme.css.ts";

export const SummonerID = ({ summoner }: { summoner: SummonerInfo }) => {
  return (
    <span
      style={{
        display: "inline-grid",
        gridTemplateColumns: "1fr auto",
        gap: 2,
      }}
    >
      <span
        style={{
          fontWeight: 600,
          color: vars.color.foreground,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {summoner.gameName}
      </span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontWeight: 400,
          color: vars.color.mutedForeground,
        }}
      >
        #{summoner.tagLine}
      </span>
    </span>
  );
};
