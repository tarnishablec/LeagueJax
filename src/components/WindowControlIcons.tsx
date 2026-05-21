/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";

type IconProps = JSX.SvgSVGAttributes<SVGSVGElement>;

export function MinimizeIcon(props: IconProps) {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true" {...props}>
      <path d="M0 0.5 H10" stroke="currentColor" stroke-width="1" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0 0 L10 10 M10 0 L0 10"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
      />
    </svg>
  );
}
