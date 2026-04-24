import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { LucideIcon } from "lucide-react";
import * as s from "./IconTitleSubtitleState.css";

type IconTitleSubtitleStateProps = {
  className?: string;
  icon: LucideIcon;
  subtitle?: string;
  title: string;
  titleWeight?: number;
};

export function IconTitleSubtitleState({
  className,
  icon: Icon,
  subtitle,
  title,
  titleWeight = 400,
}: IconTitleSubtitleStateProps) {
  return (
    <div className={[s.root, className].filter(Boolean).join(" ")}>
      <Icon className={s.icon} aria-hidden={true} />
      <div
        className={s.title}
        style={assignInlineVars({
          [s.titleWeightVar]: String(titleWeight),
        })}
      >
        {title}
      </div>
      {subtitle ? <div className={s.subtitle}>{subtitle}</div> : null}
    </div>
  );
}
