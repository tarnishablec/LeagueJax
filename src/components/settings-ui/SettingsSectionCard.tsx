import type React from "react";
import * as s from "./SettingsSectionCard.css";

interface SettingsSectionCardProps {
  title?: string;
  contextKey?: string;
  children?: React.ReactNode;
}

export function SettingsSectionCard({
  title,
  contextKey,
  children,
}: SettingsSectionCardProps) {
  return (
    <section className={s.card} data-settings-section-key={contextKey}>
      {title?.trim() ? <div className={s.title}>{title}</div> : null}
      <div className={s.body}>{children}</div>
    </section>
  );
}
