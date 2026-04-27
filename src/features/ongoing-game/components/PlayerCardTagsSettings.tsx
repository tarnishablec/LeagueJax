import { Checkbox } from "@ark-ui/react/checkbox";
import { ColorPicker, parseColor } from "@ark-ui/react/color-picker";
import { Portal } from "@ark-ui/react/portal";
import { Check, Pipette } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
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

function TagColorPicker(props: {
  color: string;
  colorSettingId: PlayerCardTagColorSettingItem["id"];
  defaultColor: string;
  id: string;
  label: string;
  onColorChange: (color: string) => void;
}) {
  const { color, colorSettingId, defaultColor, id, label, onColorChange } =
    props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [colorValue, setColorValue] = useState(() =>
    parseColor(oklchColorToHex(color)),
  );
  const pickerLabel = `Player card tag color ${id}`;

  useEffect(() => {
    setColorValue(parseColor(oklchColorToHex(color)));
  }, [color]);

  const commitColor = (nextColor = colorValue) => {
    onColorChange(oklchColorToHex(nextColor.toString("hex")));
  };
  const commitPreset = (preset: string) => {
    const nextColor = parseColor(preset);

    setColorValue(nextColor);
    commitColor(nextColor);
  };

  return (
    <ColorPicker.Root
      lazyMount
      unmountOnExit
      format="hsba"
      open={open}
      positioning={{ placement: "bottom-end", gutter: 6 }}
      value={colorValue}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
      onValueChange={(details) => {
        setColorValue(details.value);
      }}
      onValueChangeEnd={(details) => {
        commitColor(details.value);
      }}
    >
      <ColorPicker.Label className={s.colorLabel}>
        {pickerLabel}
      </ColorPicker.Label>
      <ColorPicker.Control className={s.colorControl}>
        <ColorPicker.Trigger
          aria-label={`Pick color for player card tag ${id}`}
          className={s.colorTrigger}
          data-setting-id={colorSettingId}
          title={label}
        >
          <ColorPicker.ValueSwatch className={s.colorValueSwatch} />
        </ColorPicker.Trigger>
      </ColorPicker.Control>
      <Portal>
        <ColorPicker.Positioner className={s.colorPositioner}>
          <ColorPicker.Content
            className={s.colorContent}
            onContextMenu={(event) => {
              event.stopPropagation();
            }}
          >
            <ColorPicker.Area className={s.colorArea}>
              <ColorPicker.AreaBackground className={s.colorAreaBackground} />
              <ColorPicker.AreaThumb className={s.colorAreaThumb} />
            </ColorPicker.Area>
            <div className={s.colorSlidersRow}>
              <ColorPicker.EyeDropperTrigger
                aria-label={`Pick screen color for player card tag ${id}`}
                className={s.eyeDropperTrigger}
              >
                <Pipette size={16} aria-hidden="true" />
              </ColorPicker.EyeDropperTrigger>
              <div className={s.colorSliderStack}>
                <ColorPicker.ChannelSlider
                  channel="hue"
                  className={s.colorSlider}
                >
                  <ColorPicker.ChannelSliderTrack
                    className={s.colorSliderTrack}
                  />
                  <ColorPicker.ChannelSliderThumb
                    className={s.colorSliderThumb}
                  />
                </ColorPicker.ChannelSlider>
                <ColorPicker.ChannelSlider
                  channel="alpha"
                  className={s.colorSlider}
                >
                  <ColorPicker.ChannelSliderTrack
                    className={s.colorSliderTrack}
                  />
                  <ColorPicker.ChannelSliderThumb
                    className={s.colorSliderThumb}
                  />
                </ColorPicker.ChannelSlider>
              </div>
            </div>
            <div className={s.colorInputsRow}>
              <ColorPicker.ChannelInput
                aria-label={`Hex color for player card tag ${id}`}
                channel="hex"
                className={s.colorInput}
              />
              <ColorPicker.ChannelInput
                aria-label={`Alpha color for player card tag ${id}`}
                channel="alpha"
                className={s.colorInput}
              />
            </div>
            <div className={s.savedColorsLabel}>
              {t("settings.ongoing.playerCardTags.savedColors")}
            </div>
            <ColorPicker.SwatchGroup className={s.swatchGroup}>
              {[defaultColor, ...COLOR_PRESETS].map((preset) => {
                const presetHex = oklchColorToHex(preset);

                return (
                  <ColorPicker.SwatchTrigger
                    key={preset}
                    aria-label={`Use preset color ${presetHex} for player card tag ${id}`}
                    className={s.swatchTrigger}
                    value={presetHex}
                    onClick={() => {
                      commitPreset(presetHex);
                    }}
                  >
                    <ColorPicker.Swatch
                      className={s.swatch}
                      value={presetHex}
                    />
                  </ColorPicker.SwatchTrigger>
                );
              })}
            </ColorPicker.SwatchGroup>
          </ColorPicker.Content>
        </ColorPicker.Positioner>
      </Portal>
      <ColorPicker.HiddenInput />
    </ColorPicker.Root>
  );
}

function PlayerCardTagColorPicker(props: {
  colorSetting: PlayerCardTagColorSettingItem;
  label: string;
}) {
  const { colorSetting, label } = props;
  const settings = useSettings();
  const color = usePlayerCardTagColor(colorSetting);

  const updateColor = (nextColor: string) => {
    settings.set(colorSetting.id, nextColor);
  };

  return (
    <TagColorPicker
      color={color}
      colorSettingId={colorSetting.id}
      defaultColor={colorSetting.defaultColor}
      id={colorSetting.tagId}
      label={label}
      onColorChange={updateColor}
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
