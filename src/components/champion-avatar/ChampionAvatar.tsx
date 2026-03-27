import { LazyImage } from "@/components/LazyImage";
import { useChampionIcon } from "@/hooks/use-champion-icon";
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

export function ChampionAvatar({
  championId,
  imageClassName,
  fallbackClassName,
  wrapperClassName,
  level,
  levelClassName,
  alt = "",
}: {
  championId: number | null | undefined;
  imageClassName: string;
  fallbackClassName: string;
  wrapperClassName?: string;
  level?: number | null;
  levelClassName?: string;
  alt?: string;
}) {
  const iconUrl = useChampionIcon(championId);
  const showLevel = typeof level === "number" && level > 0;
  const mergedWrapperClassName = joinClassNames(s.wrapper, wrapperClassName);
  const mergedLevelClassName = joinClassNames(s.levelBadge, levelClassName);

  if (!iconUrl) {
    return (
      <span className={mergedWrapperClassName}>
        <span className={fallbackClassName} aria-hidden="true" />
        {showLevel ? (
          <span className={mergedLevelClassName}>{level}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={mergedWrapperClassName}>
      <LazyImage
        src={iconUrl}
        alt={alt}
        className={`${imageClassName}`}
        fallbackClassName={fallbackClassName}
      />
      {showLevel ? <span className={mergedLevelClassName}>{level}</span> : null}
    </span>
  );
}
