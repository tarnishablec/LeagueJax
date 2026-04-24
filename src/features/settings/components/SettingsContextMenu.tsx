import { Menu } from "@ark-ui/react/menu";
import { Portal } from "@ark-ui/react/portal";
import type { MouseEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/features/settings/context";
import type {
  RegisteredSetting,
  SettingId,
  SettingsSectionKey,
} from "@/features/settings/types";
import * as s from "./SettingsContextMenu.css";
import type { PageEntry, SectionEntry } from "./settings-view-model";

interface SettingsContextMenuProps {
  page: PageEntry;
  children: ReactNode;
}

interface ContextTarget {
  settingId?: SettingId;
  sectionKey?: SettingsSectionKey;
}

const settingSelector = "[data-setting-id]";
const sectionSelector = "[data-settings-section-key]";

const isResettableSetting = (field: RegisteredSetting): boolean => {
  return field.control.kind !== "action";
};

export function SettingsContextMenu({
  page,
  children,
}: SettingsContextMenuProps) {
  const settings = useSettings();
  const { t } = useTranslation();
  const [target, setTarget] = useState<ContextTarget>({});

  const context = useMemo(() => {
    const fields = new Map<SettingId, RegisteredSetting>();
    const sections = new Map<SettingsSectionKey, SectionEntry>();

    for (const section of page.sections) {
      const sectionKey = `${page.id}.${section.id}` as SettingsSectionKey;
      sections.set(sectionKey, section);

      for (const field of section.fields) {
        fields.set(field.id, field);
      }
    }

    return { fields, sections };
  }, [page]);

  const activeField = target.settingId
    ? context.fields.get(target.settingId)
    : undefined;
  const activeSection = target.sectionKey
    ? context.sections.get(target.sectionKey)
    : undefined;
  const sectionResetIds =
    activeSection?.fields
      .filter(isResettableSetting)
      .map((field) => field.id) ?? [];
  const canResetSetting =
    activeField !== undefined && isResettableSetting(activeField);
  const canResetSection = sectionResetIds.length > 0;

  const resetActiveSetting = () => {
    if (!activeField || !isResettableSetting(activeField)) {
      return;
    }

    settings.reset([activeField.id]);
  };

  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (!(event.target instanceof Element)) {
      setTarget({});
      return;
    }

    const settingNode = event.target.closest(
      settingSelector,
    ) as HTMLElement | null;
    const sectionNode = event.target.closest(
      sectionSelector,
    ) as HTMLElement | null;
    const settingId = settingNode?.dataset.settingId as SettingId | undefined;
    const sectionKey = sectionNode?.dataset.settingsSectionKey as
      | SettingsSectionKey
      | undefined;

    setTarget({
      settingId:
        settingId && context.fields.has(settingId) ? settingId : undefined,
      sectionKey:
        sectionKey && context.sections.has(sectionKey) ? sectionKey : undefined,
    });
  };

  return (
    <Menu.Root positioning={{ placement: "bottom-start", strategy: "fixed" }}>
      <Menu.ContextTrigger asChild onContextMenu={handleContextMenu}>
        <div className={s.scope}>{children}</div>
      </Menu.ContextTrigger>
      <Portal>
        <Menu.Positioner className={s.positioner}>
          <Menu.Content
            className={s.content}
            aria-label="Settings context menu"
          >
            {canResetSetting ? (
              <Menu.Item
                className={s.item}
                value="reset-setting"
                onSelect={resetActiveSetting}
              >
                {t("settings.contextMenu.resetSetting")}
              </Menu.Item>
            ) : null}
            {canResetSection ? (
              <Menu.Item
                className={s.item}
                value="reset-section"
                onSelect={() => settings.reset(sectionResetIds)}
              >
                {t("settings.contextMenu.resetSection")}
              </Menu.Item>
            ) : null}
            {canResetSetting || canResetSection ? (
              <Menu.Separator className={s.separator} />
            ) : null}
            <Menu.Item
              className={s.item}
              value="reset-all-settings"
              onSelect={() => settings.reset()}
            >
              {t("settings.contextMenu.resetAll")}
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
