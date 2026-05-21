/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import * as s from "./BrandGradientText.css.ts";

type BrandGradientTextProps = {
  children?: JSX.Element;
  class?: string;
  className?: string;
  variant?: keyof typeof s.variant;
};

export function BrandGradientText(props: BrandGradientTextProps): JSX.Element {
  const variant = () => props.variant ?? "inline";
  const resolvedClassName = () =>
    [s.root, s.variant[variant()], props.class, props.className]
      .filter(Boolean)
      .join(" ");

  return <span class={resolvedClassName()}>{props.children}</span>;
}
