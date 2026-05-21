/** @jsxImportSource solid-js */
import { Menu } from "@ark-ui/solid/menu";
import type { JSX } from "solid-js";
import { createMemo, createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import type {
  RegisteredSetting,
  SettingId,
  SettingsGroupKey,
  SettingsSectionKey,
} from "@/features/settings/types";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./SettingsContextMenu.css.ts";
import type { PageEntry, SectionEntry } from "./settings-view-model";

interface SettingsContextMenuProps {
  page: PageEntry;
  children: JSX.Element;
}

interface ContextTarget {
  groupKey?: SettingsGroupKey;
  settingId?: SettingId;
  sectionKey?: SettingsSectionKey;
}

const groupSelector = "[data-settings-group-key]";
const settingSelector = "[data-setting-id]";
const sectionSelector = "[data-settings-section-key]";

const isResettableSetting = (field: RegisteredSetting): boolean => {
  return field.control.kind !== "action";
};

export function SettingsContextMenu(
  props: SettingsContextMenuProps,
): JSX.Element {
  const settings = useSolidSettings();
  const { t } = useSolidTranslation();
  const [target, setTarget] = createSignal<ContextTarget>({});

  const context = createMemo(() => {
    const fields = new Map<SettingId, RegisteredSetting>();
    const sections = new Map<SettingsSectionKey, SectionEntry>();

    for (const section of props.page.sections) {
      const sectionKey = `${props.page.id}.${section.id}` as SettingsSectionKey;
      sections.set(sectionKey, section);

      for (const field of section.fields) {
        fields.set(field.id, field);
      }
    }

    return { fields, sections };
  });

  const resettableFields = createMemo(() =>
    [...context().fields.values()].filter(isResettableSetting),
  );
  const resetIdsByPrefix = (prefix: string): SettingId[] =>
    resettableFields()
      .filter(
        (field) => field.id === prefix || field.id.startsWith(`${prefix}.`),
      )
      .map((field) => field.id);
  const activeField = createMemo(() => {
    const settingId = target().settingId;
    return settingId ? context().fields.get(settingId) : undefined;
  });
  const activeSection = createMemo(() => {
    const sectionKey = target().sectionKey;
    return sectionKey ? context().sections.get(sectionKey) : undefined;
  });
  const groupResetIds = createMemo(() => {
    const groupKey = target().groupKey;
    return groupKey ? resetIdsByPrefix(groupKey) : [];
  });
  const sectionResetIds = createMemo(() => {
    const sectionKey = target().sectionKey;
    return sectionKey && activeSection() ? resetIdsByPrefix(sectionKey) : [];
  });
  const pageResetIds = createMemo(() => resetIdsByPrefix(props.page.id));
  const canResetGroup = createMemo(() => groupResetIds().length > 0);
  const canResetSetting = createMemo(() => {
    const field = activeField();
    return field !== undefined && isResettableSetting(field);
  });
  const canResetSection = createMemo(() => sectionResetIds().length > 0);
  const canResetPage = createMemo(() => pageResetIds().length > 0);

  const resetActiveSetting = () => {
    const field = activeField();
    if (!field || !isResettableSetting(field)) {
      return;
    }

    settings.reset([field.id]);
  };

  const handleContextMenu = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) {
      setTarget({});
      return;
    }

    const groupNode = event.target.closest(groupSelector) as HTMLElement | null;
    const settingNode = event.target.closest(
      settingSelector,
    ) as HTMLElement | null;
    const sectionNode = event.target.closest(
      sectionSelector,
    ) as HTMLElement | null;
    const settingId = settingNode?.dataset.settingId as SettingId | undefined;
    const groupKey = groupNode?.dataset.settingsGroupKey as
      | SettingsGroupKey
      | undefined;
    const sectionKey = sectionNode?.dataset.settingsSectionKey as
      | SettingsSectionKey
      | undefined;

    setTarget({
      groupKey:
        groupKey && resetIdsByPrefix(groupKey).length > 0
          ? groupKey
          : undefined,
      settingId:
        settingId && context().fields.has(settingId) ? settingId : undefined,
      sectionKey:
        sectionKey && context().sections.has(sectionKey)
          ? sectionKey
          : undefined,
    });
  };

  return (
    <Menu.Root positioning={{ placement: "bottom-start", strategy: "fixed" }}>
      <Menu.ContextTrigger
        asChild={(getTriggerProps) => (
          <div
            {...getTriggerProps({
              role: "presentation",
              class: s.scope,
              onContextMenu: handleContextMenu,
            })}
          >
            {props.children}
          </div>
        )}
      />
      <Portal>
        <Menu.Positioner class={s.positioner}>
          <Menu.Content class={s.content} aria-label="Settings context menu">
            <Show when={canResetGroup()}>
              <Menu.Item
                class={s.item}
                value="reset-group"
                onSelect={() => settings.reset(groupResetIds())}
              >
                {t("settings.contextMenu.resetSetting")}
              </Menu.Item>
            </Show>
            <Show when={!canResetGroup() && canResetSetting()}>
              <Menu.Item
                class={s.item}
                value="reset-setting"
                onSelect={resetActiveSetting}
              >
                {t("settings.contextMenu.resetSetting")}
              </Menu.Item>
            </Show>
            <Show when={canResetSection()}>
              <Menu.Item
                class={s.item}
                value="reset-section"
                onSelect={() => settings.reset(sectionResetIds())}
              >
                {t("settings.contextMenu.resetSection")}
              </Menu.Item>
            </Show>
            <Show when={canResetPage()}>
              <Menu.Item
                class={s.item}
                value="reset-page"
                onSelect={() => settings.reset(pageResetIds())}
              >
                {t("settings.contextMenu.resetPage")}
              </Menu.Item>
            </Show>
            <Show
              when={
                canResetGroup() ||
                canResetSetting() ||
                canResetSection() ||
                canResetPage()
              }
            >
              <Menu.Separator class={s.separator} />
            </Show>
            <Menu.Item
              class={s.item}
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
