import { useTranslation } from "react-i18next";
import { SettingsSectionCard } from "@/components/settings-ui";
import { SettingsFieldRenderer } from "./SettingsFieldRenderer";
import * as s from "./SettingsHub.css";
import type { PageEntry } from "./settings-view-model";

interface SettingsSectionsProps {
  page: PageEntry;
}

export function SettingsSections({ page }: SettingsSectionsProps) {
  const { t } = useTranslation();

  return (
    <div className={s.sections}>
      {page.sections.map((section) => (
        <SettingsSectionCard
          key={`${page.id}.${section.id}`}
          title={t(`settings.sections.${page.id}.${section.id}.title`, {
            defaultValue: section.id,
          })}
        >
          {section.fields.map((field) => (
            <SettingsFieldRenderer key={field.id} field={field} />
          ))}
        </SettingsSectionCard>
      ))}
    </div>
  );
}
