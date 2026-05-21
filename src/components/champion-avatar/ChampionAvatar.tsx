/** @jsxImportSource solid-js */
import { createMemo, Show } from "solid-js";
import { LazyImage } from "@/components/LazyImage";
import { useSolidChampionIcon } from "@/hooks/use-champion-icon";
import * as s from "./ChampionAvatar.css";

function joinClassNames(
  baseClassName: string,
  extraClassName?: string,
): string {
  if (!extraClassName) {
    return baseClassName;
  }

  return `${baseClassName} ${extraClassName}`;
}

export function ChampionAvatar(props: {
  championId: number | null | undefined;
  imageClassName: string;
  fallbackClassName: string;
  wrapperClassName?: string;
  level?: number | null;
  levelClassName?: string;
  alt?: string;
}) {
  const iconUrl = useSolidChampionIcon(() => props.championId);
  const showLevel = createMemo(
    () => typeof props.level === "number" && props.level > 0,
  );
  const mergedWrapperClassName = createMemo(() =>
    joinClassNames(s.wrapper, props.wrapperClassName),
  );
  const mergedLevelClassName = createMemo(() =>
    joinClassNames(s.levelBadge, props.levelClassName),
  );

  return (
    <span class={mergedWrapperClassName()}>
      <Show
        when={iconUrl()}
        fallback={<span class={props.fallbackClassName} aria-hidden="true" />}
      >
        {(src) => (
          <LazyImage
            src={src()}
            alt={props.alt ?? ""}
            className={props.imageClassName}
            fallbackClassName={props.fallbackClassName}
          />
        )}
      </Show>
      <Show when={showLevel()}>
        <span class={mergedLevelClassName()}>{props.level}</span>
      </Show>
    </span>
  );
}
