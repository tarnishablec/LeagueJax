/** @jsxImportSource solid-js */
import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { LucideIcon } from "lucide-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import * as s from "./IconTitleSubtitleState.css";

type IconTitleSubtitleStateProps = {
  className?: string;
  icon: LucideIcon;
  subtitle?: string;
  title: string;
  titleWeight?: number;
};

export function IconTitleSubtitleState(
  props: IconTitleSubtitleStateProps,
): JSX.Element {
  const Icon = props.icon;

  return (
    <div class={[s.root, props.className].filter(Boolean).join(" ")}>
      <Icon class={s.icon} aria-hidden={true} />
      <div
        class={s.title}
        style={assignInlineVars({
          [s.titleWeightVar]: String(props.titleWeight ?? 400),
        })}
      >
        {props.title}
      </div>
      <Show when={props.subtitle}>
        {(subtitle) => <div class={s.subtitle}>{subtitle()}</div>}
      </Show>
    </div>
  );
}
