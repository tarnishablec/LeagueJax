import { ColorPicker, parseColor } from "@ark-ui/react/color-picker";
import { Portal } from "@ark-ui/react/portal";
import { Pipette } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as s from "./SettingsColorPicker.css";

const HEX_COLOR_WITH_OPTIONAL_ALPHA = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const TRANSPARENT_HEX_COLOR = "#00000000";

interface SettingsColorPickerProps {
  ariaLabel: string;
  value: string;
  presets?: string[];
  onValueChange: (value: string) => void;
}

function normalizeHexColor(
  value: unknown,
  fallback = TRANSPARENT_HEX_COLOR,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return HEX_COLOR_WITH_OPTIONAL_ALPHA.test(normalized)
    ? normalized.toUpperCase()
    : fallback;
}

function toColorValue(value: string) {
  return parseColor(normalizeHexColor(value));
}

function toHexa(value: { toString: (format: "hexa") => string }): string {
  return normalizeHexColor(value.toString("hexa"));
}

export function SettingsColorPicker({
  ariaLabel,
  value,
  presets = [],
  onValueChange,
}: SettingsColorPickerProps) {
  const { t } = useTranslation();
  const normalizedValue = normalizeHexColor(value);
  const [open, setOpen] = useState(false);
  const [colorValue, setColorValue] = useState(() =>
    toColorValue(normalizedValue),
  );
  const normalizedPresets = presets.map((preset) => normalizeHexColor(preset));

  useEffect(() => {
    setColorValue(toColorValue(normalizedValue));
  }, [normalizedValue]);

  const commitColor = (nextColor = colorValue) => {
    onValueChange(toHexa(nextColor));
  };

  const commitPreset = (preset: string) => {
    const nextColor = toColorValue(preset);

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
      <ColorPicker.Label className={s.label}>{ariaLabel}</ColorPicker.Label>
      <ColorPicker.Control className={s.control}>
        <ColorPicker.Trigger aria-label={ariaLabel} className={s.trigger}>
          <ColorPicker.ValueSwatch className={s.valueSwatch} respectAlpha />
        </ColorPicker.Trigger>
      </ColorPicker.Control>
      <Portal>
        <ColorPicker.Positioner className={s.positioner}>
          <ColorPicker.Content
            className={s.content}
            onContextMenu={(event) => {
              event.stopPropagation();
            }}
          >
            <ColorPicker.Area className={s.area}>
              <ColorPicker.AreaBackground className={s.areaBackground} />
              <ColorPicker.AreaThumb className={s.areaThumb} />
            </ColorPicker.Area>
            <div className={s.slidersRow}>
              <ColorPicker.EyeDropperTrigger
                aria-label={`${ariaLabel} eyedropper`}
                className={s.eyeDropperTrigger}
              >
                <Pipette size={16} aria-hidden="true" />
              </ColorPicker.EyeDropperTrigger>
              <div className={s.sliderStack}>
                <ColorPicker.ChannelSlider channel="hue" className={s.slider}>
                  <ColorPicker.ChannelSliderTrack className={s.sliderTrack} />
                  <ColorPicker.ChannelSliderThumb className={s.sliderThumb} />
                </ColorPicker.ChannelSlider>
                <ColorPicker.ChannelSlider channel="alpha" className={s.slider}>
                  <ColorPicker.ChannelSliderTrack className={s.sliderTrack} />
                  <ColorPicker.ChannelSliderThumb className={s.sliderThumb} />
                </ColorPicker.ChannelSlider>
              </div>
            </div>
            <div className={s.inputsRow}>
              <ColorPicker.ChannelInput
                aria-label={`${ariaLabel} hex`}
                channel="hex"
                className={s.input}
              />
              <ColorPicker.ChannelInput
                aria-label={`${ariaLabel} alpha`}
                channel="alpha"
                className={s.input}
              />
            </div>
            {normalizedPresets.length > 0 ? (
              <>
                <div className={s.presetsLabel}>
                  {t("settings.colorPicker.presets")}
                </div>
                <ColorPicker.SwatchGroup className={s.swatchGroup}>
                  {normalizedPresets.map((preset) => (
                    <ColorPicker.SwatchTrigger
                      key={preset}
                      aria-label={`Use preset color ${preset}`}
                      className={s.swatchTrigger}
                      value={preset}
                      onClick={() => {
                        commitPreset(preset);
                      }}
                    >
                      <ColorPicker.Swatch
                        className={s.swatch}
                        value={preset}
                        respectAlpha
                      />
                    </ColorPicker.SwatchTrigger>
                  ))}
                </ColorPicker.SwatchGroup>
              </>
            ) : null}
          </ColorPicker.Content>
        </ColorPicker.Positioner>
      </Portal>
      <ColorPicker.HiddenInput />
    </ColorPicker.Root>
  );
}
