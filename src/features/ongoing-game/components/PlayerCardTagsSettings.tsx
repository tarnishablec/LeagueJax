/** @jsxImportSource solid-js */
import { Checkbox } from "@ark-ui/solid/checkbox";
import { keyArray } from "@solid-primitives/keyed";
import { Check } from "lucide-solid";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import {
  SettingsColorPicker,
  SettingsHint,
} from "@/components/settings-ui";
import { SettingsFieldRenderer } from "@/features/settings/components/SettingsFieldRenderer";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import type { SettingsSectionRendererProps } from "@/features/settings/types";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
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

function usePlayerCardTagEnabled(item: PlayerCardTagSettingItem) {
  return useSolidSettingValue<boolean>(
    item.enabledSettingId,
    item.defaultEnabled,
  );
}

function usePlayerCardTagColor(item: PlayerCardTagColorSettingItem) {
  const rawColor = useSolidSettingValue<string>(item.id, item.defaultColor);
  return createMemo(() =>
    normalizePlayerCardTagColor(rawColor(), item.defaultColor),
  );
}

function PlayerCardTagColorPicker(props: {
  colorSetting: PlayerCardTagColorSettingItem;
  label: string;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const settings = useSolidSettings();
  const color = usePlayerCardTagColor(props.colorSetting);
  const presets = () =>
    [props.colorSetting.defaultColor, ...COLOR_PRESETS].map(oklchColorToHex);

  return (
    <SettingsColorPicker
      ariaLabel={`Pick color for player card tag ${props.colorSetting.tagId}`}
      outputFormat="hex"
      presets={presets()}
      presetsLabel={t("settings.ongoing.playerCardTags.savedColors")}
      respectAlpha={false}
      triggerSettingId={props.colorSetting.id}
      triggerTitle={props.label}
      value={oklchColorToHex(color())}
      variant="compact"
      width={20}
      height={20}
      onValueChange={(nextColor) => {
        settings.set(props.colorSetting.id, nextColor);
      }}
    />
  );
}

function PlayerCardTagSettingsRow(props: {
  item: PlayerCardTagSettingItem;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const settings = useSolidSettings();
  const enabled = usePlayerCardTagEnabled(props.item);
  const hint = () => (props.item.hintKey ? t(props.item.hintKey) : undefined);
  const colorPickers = keyArray(
    () => props.item.colorSettings,
    (colorSetting) => colorSetting.id,
    (colorSetting) => (
      <PlayerCardTagColorPicker
        colorSetting={colorSetting()}
        label={props.item.label}
      />
    ),
  );

  return (
    <div class={s.itemRow} data-settings-group-key={props.item.groupKey}>
      <Checkbox.Root
        aria-label={`Toggle player card tag ${props.item.id}`}
        checked={enabled() ?? props.item.defaultEnabled}
        class={s.checkboxRoot}
        onCheckedChange={(details) => {
          settings.set(props.item.enabledSettingId, details.checked === true);
        }}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control class={s.checkboxControl}>
          <Checkbox.Indicator class={s.checkboxIndicator}>
            <Check size={14} aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Control>
        <Checkbox.Label class={s.checkboxLabel}>
          {props.item.label}
        </Checkbox.Label>
        <Show when={hint()} fallback={<div />}>
          {(hintText) => <SettingsHint hint={hintText()} />}
        </Show>
      </Checkbox.Root>
      <Show when={props.item.colorSettings.length > 0}>
        <div class={s.colorPickerGroup}>{colorPickers()}</div>
      </Show>
    </div>
  );
}

export function PlayerCardTagsSettings(
  props: SettingsSectionRendererProps,
): JSX.Element {
  const { t } = useSolidTranslation();
  const items = createMemo(() => getPlayerCardTagSettingItems(t));
  const visibleFields = () => props.fields.filter((field) => field.visible);
  const fieldRows = keyArray(
    visibleFields,
    (field) => field.id,
    (field) => <SettingsFieldRenderer field={field()} />,
  );
  const itemRows = keyArray(
    items,
    (item) => item.id,
    (item) => <PlayerCardTagSettingsRow item={item()} />,
  );

  return (
    <div class={s.root}>
      {fieldRows()}
      <div class={s.description}>
        {t("settings.ongoing.playerCardTags.description")}
      </div>
      <div class={s.list}>{itemRows()}</div>
    </div>
  );
}
