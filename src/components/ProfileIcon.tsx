import type { CSSProperties } from "react";
import { LcuImage } from "@/components/LcuImage";
import { resolveProfileIconAssetPath } from "@/utils/profile-icon-assets";

type ProfileIconProps = {
  profileIconId: number | null | undefined;
  alt?: string;
  className: string;
  fallbackClassName?: string;
  loadingClassName?: string;
  onError?: () => void;
  style?: CSSProperties;
};

export function ProfileIcon({
  profileIconId,
  alt = "",
  className,
  fallbackClassName,
  loadingClassName,
  onError,
  style,
}: ProfileIconProps) {
  return (
    <LcuImage
      src={resolveProfileIconAssetPath(profileIconId)}
      alt={alt}
      className={className}
      fallbackClassName={fallbackClassName}
      loadingClassName={loadingClassName}
      onError={onError}
      style={style}
    />
  );
}
