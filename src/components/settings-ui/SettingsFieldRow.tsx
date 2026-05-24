/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import * as s from "./SettingsFieldRow.css";
import { SettingsHint, type SettingsHintTone } from "./SettingsHint";

interface SettingsFieldRowProps {
  controlAlign?: "stretch" | "start" | "end";
  label: string;
  hint?: string;
  hintTone?: SettingsHintTone;
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
            {(hint) => (
              <SettingsHint hint={hint()} tone={props.hintTone ?? "info"} />
            )}
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
