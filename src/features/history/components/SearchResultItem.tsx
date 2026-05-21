/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import type { SummonerSearchResult } from "@/bindings/summoner";
import { ProfileIcon } from "@/components/ProfileIcon";
import * as s from "./HistoryToolbar.css";

function ResultAvatar(props: { profileIconId: number }): JSX.Element {
  return (
    <ProfileIcon
      profileIconId={props.profileIconId}
      alt=""
      className={s.resultAvatar}
      fallbackClassName={s.resultAvatarFallback}
    />
  );
}

export function SearchResultItem(props: {
  result: SummonerSearchResult;
  onClick: () => void;
}): JSX.Element {
  return (
    <button type="button" class={s.resultButton} onClick={props.onClick}>
      <ResultAvatar profileIconId={props.result.profileIconId} />
      <span class={s.resultName}>
        {props.result.gameName}
        {props.result.tagLine.length > 0 ? `#${props.result.tagLine}` : ""}
      </span>
      <span class={s.resultMeta}>
        <span>{props.result.sgpServerId}</span>
        <span>Lv.{props.result.summonerLevel}</span>
      </span>
    </button>
  );
}
