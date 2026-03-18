import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ThemeToggle.tsx";
import { useAppStore } from "@/stores/app";
import * as s from "./GeneralSettingsSection.css";

export function GeneralSettingsSection() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  return (
    <div className={s.section}>
      <div className={s.row}>
        <span className={s.label}>{t("settings.language.label")}</span>
        <div className={s.control}>
          <select
            aria-label="Language"
            className={s.select}
            value={language}
            onChange={(event) => {
              const next = event.target.value;
              setLanguage(next);
              void i18n.changeLanguage(next);
            }}
          >
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className={s.row}>
        <span className={s.label}>{t("settings.theme.label")}</span>
        <div className={s.control}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
