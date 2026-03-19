import type React from "react";
import * as s from "./SettingsSectionCard.css";

interface SettingsSectionCardProps {
  title: string;
  children?: React.ReactNode;
}

export function SettingsSectionCard({
  title,
  children,
}: SettingsSectionCardProps) {
  return (
    <section className={s.card}>
      <div className={s.title}>{title}</div>
      <div className={s.body}>{children}</div>
    </section>
  );
}
