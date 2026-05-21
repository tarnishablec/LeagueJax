/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { LcuImage } from "@/components/LcuImage";
import { resolveProfileIconAssetPath } from "@/utils/profile-icon-assets";

type ProfileIconProps = {
  profileIconId: number | null | undefined;
  alt?: string;
  className: string;
  fallbackClassName?: string;
  loadingClassName?: string;
  onError?: () => void;
  style?: JSX.CSSProperties;
};

export function ProfileIcon(props: ProfileIconProps): JSX.Element {
  return (
    <LcuImage
      src={resolveProfileIconAssetPath(props.profileIconId)}
      alt={props.alt ?? ""}
      className={props.className}
      fallbackClassName={props.fallbackClassName}
      loadingClassName={props.loadingClassName}
      onError={props.onError}
      style={props.style}
    />
  );
}
