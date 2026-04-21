import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function MinimizeIcon(props: IconProps) {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true" {...props}>
      <path d="M0 0.5 H10" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function MaximizeIcon(props: IconProps) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="0.5"
        y="0.5"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
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
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
