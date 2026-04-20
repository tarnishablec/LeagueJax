import type { ReactNode } from "react";
import * as s from "./BrandGradientText.css";

type BrandGradientTextProps = {
  children?: ReactNode;
  className?: string;
  variant?: keyof typeof s.variant;
};

export function BrandGradientText({
  children,
  className,
  variant = "inline",
}: BrandGradientTextProps) {
  const resolvedClassName = [s.root, s.variant[variant], className]
    .filter(Boolean)
    .join(" ");

  return <span className={resolvedClassName}>{children}</span>;
}
