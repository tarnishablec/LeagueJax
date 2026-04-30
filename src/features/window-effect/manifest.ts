import { z } from "zod";
import { SettingsShard } from "@/features/settings/manifest";
import { SHARD_IDS } from "@/features/shard-ids";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import {
  isWindowEffectBaseColor,
  WINDOW_EFFECT_BASE_COLOR_DEFAULT,
  WINDOW_EFFECT_BASE_COLOR_PRESETS,
  WINDOW_EFFECT_BASE_COLOR_SETTING_ID,
} from "./color";
import { windowEffectI18n } from "./i18n";

const windowEffectBaseColorSchema = z
  .string()
  .refine(isWindowEffectBaseColor, {
    message: "Expected #RRGGBB or #RRGGBBAA.",
  })
  .transform((value) => value.toUpperCase());

export class WindowEffectShard implements WebShard {
  public label() {
    return "WindowEffectShard";
  }

  public id() {
    return SHARD_IDS.WINDOW_EFFECT;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS] as const;
  }

  public setup(jax: Jax): void {
    const settings = jax.getShard(SettingsShard);

    settings.registerSetting({
      id: WINDOW_EFFECT_BASE_COLOR_SETTING_ID,
      labelKey: "settings.windowEffectBaseColor.label",
      hintKey: "settings.windowEffectBaseColor.hint",
      scope: "frontend",
      control: {
        kind: "color",
        livePreview: true,
        presets: [...WINDOW_EFFECT_BASE_COLOR_PRESETS],
      },
      zod: windowEffectBaseColorSchema,
      defaultValue: WINDOW_EFFECT_BASE_COLOR_DEFAULT,
      order: 40,
      onSet: () => {},
    });
  }

  public i18nResources() {
    return windowEffectI18n;
  }
}
