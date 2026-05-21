/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";

const logoUrls = {
  transparent: new URL("../assets/fish_2_transparent_512.png", import.meta.url)
    .href,
  dark: new URL("../assets/fish_2_dark_512.png", import.meta.url).href,
} as const;

type JaxLogoVariant = keyof typeof logoUrls;

interface JaxLogoProps {
  class?: string;
  size?: number;
  variant?: JaxLogoVariant;
}

export function JaxLogo(props: JaxLogoProps): JSX.Element {
  const size = () => props.size ?? 32;

  return (
    <img
      src={logoUrls[props.variant ?? "transparent"]}
      width={size()}
      height={size()}
      alt=""
      aria-hidden="true"
      draggable={false}
      class={props.class}
    />
  );
}
