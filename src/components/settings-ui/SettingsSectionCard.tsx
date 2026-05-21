/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import * as s from "./SettingsSectionCard.css.ts";

interface SettingsSectionCardProps {
  title?: string;
  contextKey?: string;
  children?: JSX.Element;
}

export function SettingsSectionCard(props: SettingsSectionCardProps) {
  return (
    <section class={s.card} data-settings-section-key={props.contextKey}>
      <Show when={props.title?.trim()}>
        {(title) => <div class={s.title}>{title()}</div>}
      </Show>
      <div class={s.body}>{props.children}</div>
    </section>
  );
}
