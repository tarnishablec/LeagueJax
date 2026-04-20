import type React from "react";
import * as s from "./SettingsSectionCard.css";

interface SettingsSectionCardProps {
  title?: string;
  children?: React.ReactNode;
}

export function SettingsSectionCard({
  title,
  children,
}: SettingsSectionCardProps) {
  return (
    <section className={s.card}>
      {title?.trim() ? <div className={s.title}>{title}</div> : null}
      <div className={s.body}>{children}</div>
    </section>
  );
}
