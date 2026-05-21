/** @jsxImportSource solid-js */
import { ColorPicker, parseColor } from "@ark-ui/solid/color-picker";
import { Key } from "@solid-primitives/keyed";
import { Pipette } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./SettingsColorPicker.css.ts";
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

export function SettingsColorPicker(
  props: SettingsColorPickerProps,
): JSX.Element {
  const { t } = useSolidTranslation();
  const outputFormat = () => props.outputFormat ?? "hexa";
  const normalizedValue = createMemo(() => normalizeHexColor(props.value));
  const [open, setOpen] = createSignal(false);
  const [colorValue, setColorValue] = createSignal(
    toColorValue(normalizedValue()),
  );
  const normalizedPresets = createMemo(() =>
    (props.presets ?? []).map((preset) => normalizeHexColor(preset)),
  );

  createEffect(() => {
    setColorValue((currentColor) => {
      if (toHexColor(currentColor, outputFormat()) === normalizedValue()) {
        return currentColor;
      }

      return toColorValue(normalizedValue());
    });
  });

  const commitColor = (nextColor = colorValue()) => {
    props.onValueChange(toHexColor(nextColor, outputFormat()));
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
      class={settingsControlClassName({
        className: props.className,
        fit: props.fit,
        size: props.size,
      })}
      style={
        settingsControlStyle({
          fit: props.fit,
          height: props.height,
          size: props.size,
          width: props.width,
        }) as unknown as JSX.CSSProperties
      }
      format="hsba"
      open={open()}
      positioning={{ placement: "bottom-end", gutter: 6 }}
      value={colorValue()}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
      onValueChange={(details) => {
        setColorValue(details.value);
        if (props.livePreview ?? false) {
          commitColor(details.value);
        }
      }}
      onValueChangeEnd={(details) => {
        if (!(props.livePreview ?? false)) {
          commitColor(details.value);
        }
      }}
    >
      <ColorPicker.Label class={s.label}>{props.ariaLabel}</ColorPicker.Label>
      <ColorPicker.Control class={s.control}>
        <ColorPicker.Trigger
          aria-label={props.ariaLabel}
          class={s.trigger({ variant: props.variant ?? "default" })}
          data-setting-id={props.triggerSettingId}
          title={props.triggerTitle}
        >
          <ColorPicker.ValueSwatch
            class={s.valueSwatch}
            respectAlpha={props.respectAlpha ?? true}
          />
        </ColorPicker.Trigger>
      </ColorPicker.Control>
      <Portal>
        <ColorPicker.Positioner class={s.positioner}>
          <ColorPicker.Content
            class={s.content}
            onContextMenu={(event) => {
              event.stopPropagation();
            }}
          >
            <ColorPicker.Area class={s.area}>
              <ColorPicker.AreaBackground class={s.areaBackground} />
              <ColorPicker.AreaThumb class={s.areaThumb} />
            </ColorPicker.Area>
            <div class={s.slidersRow}>
              <ColorPicker.EyeDropperTrigger
                aria-label={`${props.ariaLabel} eyedropper`}
                class={s.eyeDropperTrigger}
              >
                <Pipette size={16} aria-hidden="true" />
              </ColorPicker.EyeDropperTrigger>
              <div class={s.sliderStack}>
                <ColorPicker.ChannelSlider channel="hue" class={s.slider}>
                  <ColorPicker.ChannelSliderTrack class={s.sliderTrack} />
                  <ColorPicker.ChannelSliderThumb class={s.sliderThumb} />
                </ColorPicker.ChannelSlider>
                <ColorPicker.ChannelSlider channel="alpha" class={s.slider}>
                  <ColorPicker.ChannelSliderTrack class={s.sliderTrack} />
                  <ColorPicker.ChannelSliderThumb class={s.sliderThumb} />
                </ColorPicker.ChannelSlider>
              </div>
            </div>
            <div class={s.inputsRow}>
              <ColorPicker.ChannelInput
                aria-label={`${props.ariaLabel} hex`}
                channel="hex"
                class={s.input}
              />
              <ColorPicker.ChannelInput
                aria-label={`${props.ariaLabel} alpha`}
                channel="alpha"
                class={s.input}
              />
            </div>
            <Show when={normalizedPresets().length > 0}>
              <div class={s.presetsLabel}>
                {props.presetsLabel ?? t("settings.colorPicker.presets")}
              </div>
              <ColorPicker.SwatchGroup class={s.swatchGroup}>
                <Key each={normalizedPresets()} by={(preset) => preset}>
                  {(preset) => (
                    <ColorPicker.SwatchTrigger
                      aria-label={`Use preset color ${preset()}`}
                      class={s.swatchTrigger({
                        variant: props.variant ?? "default",
                      })}
                      value={preset()}
                      onClick={() => {
                        commitPreset(preset());
                      }}
                    >
                      <ColorPicker.Swatch
                        class={s.swatch}
                        value={preset()}
                        respectAlpha={props.respectAlpha ?? true}
                      />
                    </ColorPicker.SwatchTrigger>
                  )}
                </Key>
              </ColorPicker.SwatchGroup>
            </Show>
          </ColorPicker.Content>
        </ColorPicker.Positioner>
      </Portal>
      <ColorPicker.HiddenInput />
    </ColorPicker.Root>
  );
}
