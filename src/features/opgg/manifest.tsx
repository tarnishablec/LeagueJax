/** @jsxImportSource solid-js */
import { lazy } from "solid-js";
import { SettingsFieldRow, SettingsInput } from "@/components/settings-ui";
import { useSolidSettings } from "@/features/settings/solid-context";
import { SolidSettingsShard } from "@/features/settings/solid-settings-shard";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
import type { Jax } from "@/jax";
import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { SHARD_IDS } from "../shard-ids";
import { OpggIcon } from "./components/OpggIcon";
import { championsI18n } from "./i18n";
import {
  DEFAULT_COUNTER_COLUMN_LIMIT,
  OPGG_COUNTER_COLUMN_LIMIT_SETTING,
  parseCounterColumnLimit,
} from "./settings";

const ChampionsRoute = lazy(() => import("./routes/ChampionsRoute"));

// The generic settings store validates number types only; this feature owns
// the integer/range rule while reusing the standard settings row and control.
function OpggMatchupSettings() {
  const settings = useSolidSettings();
  const { t } = useSolidTranslation();
  const value = useSolidSettingValue<number>(
    OPGG_COUNTER_COLUMN_LIMIT_SETTING,
    DEFAULT_COUNTER_COLUMN_LIMIT,
  );
  return (
    <SettingsFieldRow
      label={t("settings.opgg.counterColumnLimit.label")}
      hint={t("settings.opgg.counterColumnLimit.hint")}
      settingId={OPGG_COUNTER_COLUMN_LIMIT_SETTING}
      scopeTag="ts/rs"
    >
      <SettingsInput
        type="number"
        ariaLabel="Setting opgg.matchups.counterColumnLimit"
        value={String(value() ?? DEFAULT_COUNTER_COLUMN_LIMIT)}
        min={1}
        max={50}
        step={1}
        onValueChange={(next) => {
          if (next.trim() === "") return;
          const limit = parseCounterColumnLimit(Number(next));
          if (limit !== undefined)
            settings.set(OPGG_COUNTER_COLUMN_LIMIT_SETTING, limit);
        }}
      />
    </SettingsFieldRow>
  );
}

export class SolidChampionsShard implements SolidWebShard {
  public label() {
    return "SolidChampionsShard";
  }

  public id() {
    return SHARD_IDS.CHAMPIONS;
  }

  public dependsOn() {
    return [SHARD_IDS.I18N, SHARD_IDS.SETTINGS];
  }

  public setup(jax: Jax): void {
    const settings = jax.getShard(SolidSettingsShard);
    settings.registerPage({ id: "opgg", order: 25 });
    settings.registerSection({ key: "opgg.filters", order: 5 });
    settings.registerSection({
      key: "opgg.matchups",
      order: 10,
      renderer: OpggMatchupSettings,
    });
  }

  public routes() {
    return [
      {
        path: "opgg",
        component: ChampionsRoute,
        order: 20,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/main/opgg",
        labelKey: "nav.champions",
        icon: OpggIcon,
        section: "main" as const,
        order: 25,
      },
    ];
  }

  public i18nResources() {
    return championsI18n;
  }
}
