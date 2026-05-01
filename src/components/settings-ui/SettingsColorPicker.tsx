import { ColorPicker, parseColor } from "@ark-ui/react/color-picker";
import { Portal } from "@ark-ui/react/portal";
import { Pipette } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as s from "./SettingsColorPicker.css";
import {
  type SettingsControlLayoutProps,
  settingsControlClassName,
  settingsControlStyle,
} from "./SettingsControl";

const HEX_COLOR_WITH_OPTIONAL_ALPHA = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const TRANSPARENT_HEX_COLOR = "#00000000";

type ColorPickerOutputFormat = "hex" | "hexa";
type ColorPickerVariant = "default" | "compact";

interface SettingsColorPickerProps extends SettingsControlLayoutProps {
  ariaLabel: string;
  livePreview?: boolean;
  outputFormat?: ColorPickerOutputFormat;
  value: string;
  presets?: string[];
  presetsLabel?: string;
  respectAlpha?: boolean;
  triggerSettingId?: string;
  triggerTitle?: string;
  variant?: ColorPickerVariant;
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

function toHexColor(
  value: { toString: (format: ColorPickerOutputFormat) => string },
  outputFormat: ColorPickerOutputFormat,
): string {
  return normalizeHexColor(value.toString(outputFormat));
}

export function SettingsColorPicker({
  ariaLabel,
  className,
  fit,
  height,
  livePreview = false,
  outputFormat = "hexa",
  value,
  presets = [],
  presetsLabel,
  respectAlpha = true,
  size,
  width,
  triggerSettingId,
  triggerTitle,
  variant = "default",
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
    setColorValue((currentColor) => {
      if (toHexColor(currentColor, outputFormat) === normalizedValue) {
        return currentColor;
      }

      return toColorValue(normalizedValue);
    });
  }, [normalizedValue, outputFormat]);

  const commitColor = (nextColor = colorValue) => {
    onValueChange(toHexColor(nextColor, outputFormat));
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
      className={settingsControlClassName({ className, fit, size })}
      style={settingsControlStyle({ fit, height, size, width })}
      format="hsba"
      open={open}
      positioning={{ placement: "bottom-end", gutter: 6 }}
      value={colorValue}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
      onValueChange={(details) => {
        setColorValue(details.value);
        if (livePreview) {
          commitColor(details.value);
        }
      }}
      onValueChangeEnd={(details) => {
        if (!livePreview) {
          commitColor(details.value);
        }
      }}
    >
      <ColorPicker.Label className={s.label}>{ariaLabel}</ColorPicker.Label>
      <ColorPicker.Control className={s.control}>
        <ColorPicker.Trigger
          aria-label={ariaLabel}
          className={s.trigger({ variant })}
          data-setting-id={triggerSettingId}
          title={triggerTitle}
        >
          <ColorPicker.ValueSwatch
            className={s.valueSwatch}
            respectAlpha={respectAlpha}
          />
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
                  {presetsLabel ?? t("settings.colorPicker.presets")}
                </div>
                <ColorPicker.SwatchGroup className={s.swatchGroup}>
                  {normalizedPresets.map((preset) => (
                    <ColorPicker.SwatchTrigger
                      key={preset}
                      aria-label={`Use preset color ${preset}`}
                      className={s.swatchTrigger({ variant })}
                      value={preset}
                      onClick={() => {
                        commitPreset(preset);
                      }}
                    >
                      <ColorPicker.Swatch
                        className={s.swatch}
                        value={preset}
                        respectAlpha={respectAlpha}
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
