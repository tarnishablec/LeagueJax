import { LazyImage } from "@/components/LazyImage";
import { useChampionIcon } from "@/hooks/use-champion-icon";

export function MatchCardChampionIcon({
  championId,
  className,
  fallbackClassName,
}: {
  championId: number;
  className: string;
  fallbackClassName: string;
}) {
  const iconUrl = useChampionIcon(championId);

  if (!iconUrl) {
    return <span className={fallbackClassName} aria-hidden="true" />;
  }

  return (
    <LazyImage
      src={iconUrl}
      alt=""
      className={className}
      fallbackClassName={fallbackClassName}
    />
  );
}
