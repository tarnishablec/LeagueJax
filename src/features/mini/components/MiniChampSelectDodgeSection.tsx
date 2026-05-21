/** @jsxImportSource solid-js */
import { LogOut } from "lucide-solid";
import { Show } from "solid-js";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./MiniChampSelectDodgeSection.css";

export function MiniChampSelectDodgeSection(props: {
  error?: string | null;
  pending: boolean;
  onDodge: () => void;
}) {
  const { t } = useSolidTranslation();

  return (
    <section class={s.root}>
      <div class={s.title}>{t("mini.champSelect.dodge.title")}</div>
      <button
        type="button"
        aria-label="Dodge champion select"
        class={s.button}
        disabled={props.pending}
        onClick={props.onDodge}
      >
        <LogOut size={14} aria-hidden="true" />
        <span>
          {props.pending
            ? t("mini.champSelect.dodge.pending")
            : t("mini.champSelect.dodge.action")}
        </span>
      </button>
      <Show when={props.error}>
        {(error) => <div class={s.error}>{error()}</div>}
      </Show>
    </section>
  );
}
