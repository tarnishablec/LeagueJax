import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as s from "./MiniChampSelectDodgeSection.css";

export function MiniChampSelectDodgeSection({
  error,
  pending,
  onDodge,
}: {
  error?: string | null;
  pending: boolean;
  onDodge: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section className={s.root}>
      <div className={s.title}>
        {t("mini.champSelect.dodge.title", {
          defaultValue: "退出英雄选择",
        })}
      </div>
      <button
        type="button"
        aria-label="Dodge champion select"
        className={s.button}
        disabled={pending}
        onClick={onDodge}
      >
        <LogOut size={14} aria-hidden="true" />
        <span>
          {pending
            ? t("mini.champSelect.dodge.pending", {
                defaultValue: "秒退中",
              })
            : t("mini.champSelect.dodge.action", {
                defaultValue: "立即秒退",
              })}
        </span>
      </button>
      {error ? <div className={s.error}>{error}</div> : null}
    </section>
  );
}
