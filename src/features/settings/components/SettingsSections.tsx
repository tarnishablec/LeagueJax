/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { SettingsSectionCard } from "@/components/settings-ui";
import { useSolidSettings } from "@/features/settings/solid-context";
import type {
  RegisteredSetting,
  SettingsSectionKey,
} from "@/features/settings/types";
import { useSolidTranslation } from "@/i18n/solid";
import { SettingsContextMenu } from "./SettingsContextMenu";
import { SettingsFieldRenderer } from "./SettingsFieldRenderer";
import * as s from "./SettingsHub.css.ts";
import type { PageEntry } from "./settings-view-model";

interface SettingsSectionsProps {
  page: PageEntry;
}

type SolidSettingsSectionRenderer = (props: {
  pageId: string;
  sectionId: string;
  fields: RegisteredSetting[];
}) => JSX.Element;

export function SettingsSections(props: SettingsSectionsProps): JSX.Element {
  const settings = useSolidSettings();
  const { t } = useSolidTranslation();
  const sections = keyArray(
    () => props.page.sections,
    (section) => `${props.page.id}.${section.id}`,
    (section) => {
      const sectionKey = () =>
        `${props.page.id}.${section().id}` as SettingsSectionKey;
      const renderer = () =>
        settings.getSectionRenderer(sectionKey()) as
          | SolidSettingsSectionRenderer
          | undefined;
      const fields = keyArray(
        () => section().fields,
        (field) => field.id,
        (field) => <SettingsFieldRenderer field={field()} />,
      );

      return (
        <SettingsSectionCard
          contextKey={sectionKey()}
          title={t(`settings.sections.${props.page.id}.${section().id}.title`, {
            defaultValue: section().id,
          })}
        >
          <Show when={renderer()} fallback={fields()}>
            {(sectionRenderer) =>
              sectionRenderer()({
                pageId: props.page.id,
                sectionId: section().id,
                fields: section().fields,
              })
            }
          </Show>
        </SettingsSectionCard>
      );
    },
  );

  return (
    <SettingsContextMenu page={props.page}>
      <div class={s.sections}>{sections()}</div>
    </SettingsContextMenu>
  );
}
