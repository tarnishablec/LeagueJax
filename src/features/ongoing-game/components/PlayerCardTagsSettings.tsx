import { Checkbox } from "@ark-ui/react/checkbox";
import { Check } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { SettingsColorPicker } from "@/components/settings-ui";
import { SettingsFieldRenderer } from "@/features/settings/components/SettingsFieldRenderer";
import { useSettings } from "@/features/settings/context";
import type { SettingsSectionRendererProps } from "@/features/settings/types";
import * as s from "./PlayerCardTagsSettings.css";
import {
  getPlayerCardTagSettingItems,
  normalizePlayerCardTagColor,
  oklchColorToHex,
  type PlayerCardTagColorSettingItem,
  type PlayerCardTagSettingItem,
} from "./player-card-tags.ts";

const COLOR_PRESETS = [
  "#F15E3B",
  "#ECE934",
  "#67E934",
  "#3DD8D0",
  "#36C1DC",
  "#3CA2DE",
  "#3973E4",
  "#6242E8",
  "#B23AE6",
  "#F33B63",
];

function usePlayerCardTagEnabled(item: PlayerCardTagSettingItem): boolean {
  const settings = useSettings();

  return useSyncExternalStore(
    (onStoreChange) => settings.subscribe(item.enabledSettingId, onStoreChange),
    () => settings.get<boolean>(item.enabledSettingId) ?? item.defaultEnabled,
    () => settings.get<boolean>(item.enabledSettingId) ?? item.defaultEnabled,
  );
}

function usePlayerCardTagColor(item: PlayerCardTagColorSettingItem): string {
  const settings = useSettings();

  return useSyncExternalStore(
    (onStoreChange) => settings.subscribe(item.id, onStoreChange),
    () => normalizePlayerCardTagColor(settings.get(item.id), item.defaultColor),
    () => normalizePlayerCardTagColor(settings.get(item.id), item.defaultColor),
  );
}

function PlayerCardTagColorPicker(props: {
  colorSetting: PlayerCardTagColorSettingItem;
  label: string;
}) {
  const { colorSetting, label } = props;
  const { t } = useTranslation();
  const settings = useSettings();
  const color = usePlayerCardTagColor(colorSetting);

  const updateColor = (nextColor: string) => {
    settings.set(colorSetting.id, nextColor);
  };

  return (
    <SettingsColorPicker
      ariaLabel={`Pick color for player card tag ${colorSetting.tagId}`}
      outputFormat="hex"
      presets={[colorSetting.defaultColor, ...COLOR_PRESETS].map(
        oklchColorToHex,
      )}
      presetsLabel={t("settings.ongoing.playerCardTags.savedColors")}
      respectAlpha={false}
      triggerSettingId={colorSetting.id}
      triggerTitle={label}
      value={oklchColorToHex(color)}
      variant="compact"
      onValueChange={updateColor}
    />
  );
}

function PlayerCardTagSettingsRow(props: { item: PlayerCardTagSettingItem }) {
  const { item } = props;
  const settings = useSettings();
  const enabled = usePlayerCardTagEnabled(item);

  const updateEnabled = (checked: boolean) => {
    settings.set(item.enabledSettingId, checked);
  };

  return (
    <div className={s.itemRow} data-settings-group-key={item.groupKey}>
      <Checkbox.Root
        aria-label={`Toggle player card tag ${item.id}`}
        checked={enabled}
        className={s.checkboxRoot}
        onCheckedChange={(details) => {
          updateEnabled(details.checked === true);
        }}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control className={s.checkboxControl}>
          <Checkbox.Indicator className={s.checkboxIndicator}>
            <Check size={14} aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Control>
        <Checkbox.Label className={s.checkboxLabel}>
          {item.label}
        </Checkbox.Label>
      </Checkbox.Root>
      {item.colorSettings.length > 0 ? (
        <div className={s.colorPickerGroup}>
          {item.colorSettings.map((colorSetting) => (
            <PlayerCardTagColorPicker
              key={colorSetting.id}
              colorSetting={colorSetting}
              label={item.label}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PlayerCardTagsSettings(props: SettingsSectionRendererProps) {
  const { t } = useTranslation();
  const items = useMemo(() => getPlayerCardTagSettingItems(t), [t]);
  const visibleFields = props.fields.filter((field) => field.visible);

  return (
    <div className={s.root}>
      {visibleFields.map((field) => (
        <SettingsFieldRenderer key={field.id} field={field} />
      ))}
      <div className={s.description}>
        {t("settings.ongoing.playerCardTags.description")}
      </div>
      <div className={s.list}>
        {items.map((item) => (
          <PlayerCardTagSettingsRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
