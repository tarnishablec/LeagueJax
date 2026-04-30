import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { CSSProperties } from "react";
import * as s from "./SettingsControl.css";

export type SettingsControlFit = "fill" | "content";
export type SettingsControlSize = "md" | "sm" | "auto";

export interface SettingsControlLayoutProps {
  className?: string;
  fit?: SettingsControlFit;
  height?: CSSProperties["height"];
  size?: SettingsControlSize;
  width?: CSSProperties["width"];
}

const defaultWidthByFit: Record<SettingsControlFit, string> = {
  fill: "100%",
  content: "max-content",
};

const defaultHeightBySize: Record<SettingsControlSize, string> = {
  md: "32px",
  sm: "28px",
  auto: "auto",
};

function toCssDimension(value: CSSProperties["height"]): string {
  return typeof value === "number" ? `${value}px` : String(value);
}

export function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

export function settingsControlClassName({
  className,
}: SettingsControlLayoutProps = {}): string {
  return joinClassNames(s.controlRoot, className);
}

export function settingsControlStyle({
  fit = "fill",
  height,
  size = "md",
  width,
}: SettingsControlLayoutProps = {}): CSSProperties {
  return assignInlineVars({
    [s.controlWidth]: toCssDimension(width ?? defaultWidthByFit[fit]),
    [s.controlHeight]: toCssDimension(height ?? defaultHeightBySize[size]),
  });
}
