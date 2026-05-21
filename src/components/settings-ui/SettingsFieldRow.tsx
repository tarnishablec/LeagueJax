/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import * as s from "./SettingsFieldRow.css";

interface SettingsFieldRowProps {
  controlAlign?: "stretch" | "start" | "end";
  label: string;
  hint?: string;
  settingId?: string;
  scopeTag?: string;
  children?: JSX.Element;
}

export function SettingsFieldRow(props: SettingsFieldRowProps) {
  return (
    <div class={s.row} data-setting-id={props.settingId}>
      <span class={s.label}>
        <span class={s.labelText}>
          <span>{props.label}</span>
          <Show when={props.hint}>
            {(hint) => <span title={hint()} aria-hidden="true" />}
          </Show>
        </span>
        <span class={s.scopeBadge}>{props.scopeTag ?? ""}</span>
      </span>

      <div class={s.control({ align: props.controlAlign ?? "stretch" })}>
        {props.children}
      </div>
    </div>
  );
}
