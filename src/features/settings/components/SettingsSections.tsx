import { useTranslation } from "react-i18next";
import { SettingsSectionCard } from "@/components/settings-ui";
import { useSettings } from "@/features/settings/context";
import { SettingsFieldRenderer } from "./SettingsFieldRenderer";
import * as s from "./SettingsHub.css";
import type { PageEntry } from "./settings-view-model";

interface SettingsSectionsProps {
  page: PageEntry;
}

export function SettingsSections({ page }: SettingsSectionsProps) {
  const settings = useSettings();
  const { t } = useTranslation();

  return (
    <div className={s.sections}>
      {page.sections.map((section) => {
        const sectionKey = `${page.id}.${section.id}` as const;
        const renderer = settings.getSectionRenderer(sectionKey);

        return (
          <SettingsSectionCard
            key={sectionKey}
            title={t(`settings.sections.${page.id}.${section.id}.title`, {
              defaultValue: section.id,
            })}
          >
            {renderer
              ? renderer({
                  pageId: page.id,
                  sectionId: section.id,
                  fields: section.fields,
                })
              : section.fields.map((field) => (
                  <SettingsFieldRenderer key={field.id} field={field} />
                ))}
          </SettingsSectionCard>
        );
      })}
    </div>
  );
}
