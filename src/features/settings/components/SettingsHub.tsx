import { useTranslation } from "react-i18next";
import { getSettingsSections } from "@/features/registry";
import * as s from "./SettingsHub.css";

export function SettingsHub() {
  const { t } = useTranslation();
  const sections = getSettingsSections();

  return (
    <div className={s.page}>
      <h1 className={s.title}>{t("settings.title")}</h1>
      <div className={s.sections}>
        {sections.map((section) => (
          <section key={section.id} className={s.section}>
            <h2 className={s.sectionTitle}>{t(section.titleKey)}</h2>
            {section.node}
          </section>
        ))}
      </div>
    </div>
  );
}
