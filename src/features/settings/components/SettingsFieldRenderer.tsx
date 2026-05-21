/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import {
  createListCollection,
  SettingsActionButton,
  SettingsColorPicker,
  SettingsFieldRow,
  SettingsInput,
  SettingsSelect,
  SettingsToggle,
} from "@/components/settings-ui/index";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import type {
  RegisteredSetting,
  SettingId,
  SettingScope,
} from "@/features/settings/types";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
import { createLogger } from "@/infra/logger";

type RegisteredSelectSetting = Extract<
  RegisteredSetting,
  { control: { kind: "select" } }
>;
type RegisteredInputSetting = Extract<
  RegisteredSetting,
  { control: { kind: "text" | "number" } }
>;
type RegisteredColorSetting = Extract<
  RegisteredSetting,
  { control: { kind: "color" } }
>;
type RegisteredActionSetting = Extract<
  RegisteredSetting,
  { control: { kind: "action" } }
>;

const logger = createLogger("solid-settings-field-renderer");
const loggingActionToneIds = new Set<SettingId>([
  "system.logging.openDir",
  "system.logging.cleanLogs",
]);
const actionMinLoadingMsById: Partial<Record<SettingId, number>> = {
  "system.logging.cleanLogs": 700,
};
const successFeedbackActionIds = new Set<SettingId>([
  "system.logging.cleanLogs",
]);

const toScopeTag = (scope?: SettingScope): string => {
  switch (scope) {
    case "backend":
      return "rs";
    case "shared":
      return "ts/rs";
    default:
      return "ts";
  }
};

function SelectField(props: { field: RegisteredSelectSetting }): JSX.Element {
  const settings = useSolidSettings();
  const { t } = useSolidTranslation();
  const value = useSolidSettingValue(props.field.id);
  const collection = createMemo(() =>
    createListCollection({
      items: props.field.options.map((option) => ({
        value: option.value,
        label: option.displayLabel ?? t(option.labelKey),
      })),
    }),
  );

  return (
    <SettingsSelect
      collection={collection()}
      value={[String(value() ?? "")]}
      onValueChange={(details) => {
        const next = details.value[0];
        if (next != null) {
          settings.set(props.field.id, next);
        }
      }}
    />
  );
}

function ToggleField(props: {
  ariaLabel: string;
  field: RegisteredSetting;
}): JSX.Element {
  const settings = useSolidSettings();
  const value = useSolidSettingValue(props.field.id);

  return (
    <SettingsToggle
      ariaLabel={props.ariaLabel}
      checked={Boolean(value())}
      onCheckedChange={(checked) => {
        settings.set(props.field.id, checked);
      }}
    />
  );
}

function InputField(props: {
  ariaLabel: string;
  field: RegisteredInputSetting;
}): JSX.Element {
  const settings = useSolidSettings();
  const { t } = useSolidTranslation();
  const value = useSolidSettingValue(props.field.id);
  const inputType = props.field.control.kind === "number" ? "number" : "text";
  const numberControl =
    props.field.control.kind === "number" ? props.field.control : undefined;
  const placeholder = () =>
    props.field.control.placeholderKey
      ? t(props.field.control.placeholderKey)
      : undefined;

  return (
    <SettingsInput
      ariaLabel={props.ariaLabel}
      type={inputType}
      value={String(value() ?? "")}
      min={numberControl?.min ?? undefined}
      max={numberControl?.max ?? undefined}
      step={numberControl?.step ?? undefined}
      placeholder={placeholder()}
      onValueChange={(next) => {
        if (props.field.control.kind === "number") {
          if (next.trim() === "") {
            return;
          }

          const parsed = Number(next);
          if (!Number.isNaN(parsed)) {
            settings.set(props.field.id, parsed);
          }
          return;
        }

        settings.set(props.field.id, next);
      }}
    />
  );
}

function ColorField(props: {
  ariaLabel: string;
  field: RegisteredColorSetting;
}): JSX.Element {
  const settings = useSolidSettings();
  const value = useSolidSettingValue(props.field.id);

  return (
    <SettingsColorPicker
      ariaLabel={props.ariaLabel}
      livePreview={props.field.control.livePreview}
      value={String(value() ?? "")}
      presets={props.field.control.presets}
      onValueChange={(next) => {
        settings.set(props.field.id, next);
      }}
    />
  );
}

function ActionField(props: { field: RegisteredActionSetting }): JSX.Element {
  const { t } = useSolidTranslation();
  const label = () => t(props.field.labelKey);
  const tone = () =>
    loggingActionToneIds.has(props.field.id) ? "quiet" : "accent";
  const minLoadingMs = () => actionMinLoadingMsById[props.field.id] ?? 0;
  const successFeedback = () => successFeedbackActionIds.has(props.field.id);

  return (
    <SettingsActionButton
      ariaLabel={`Action ${props.field.id}`}
      label={label()}
      minLoadingMs={minLoadingMs()}
      successFeedback={successFeedback()}
      tone={tone()}
      onClick={props.field.onAction}
      onError={(error) => {
        logger.error({ error, id: props.field.id }, "Setting action failed");
      }}
    />
  );
}

export function SettingsFieldRenderer(props: {
  field: RegisteredSetting;
}): JSX.Element | null {
  const { t } = useSolidTranslation();
  const label = () => t(props.field.labelKey);
  const hint = () => (props.field.hintKey ? t(props.field.hintKey) : undefined);
  const ariaLabel = () => `Setting ${props.field.id}`;
  const scopeTag = () => toScopeTag(props.field.scope);

  if (!props.field.visible) {
    return null;
  }

  switch (props.field.control.kind) {
    case "select":
      return (
        <SettingsFieldRow
          label={label()}
          hint={hint()}
          settingId={props.field.id}
          scopeTag={scopeTag()}
        >
          <SelectField field={props.field as RegisteredSelectSetting} />
        </SettingsFieldRow>
      );
    case "toggle":
      return (
        <SettingsFieldRow
          label={label()}
          hint={hint()}
          settingId={props.field.id}
          scopeTag={scopeTag()}
        >
          <ToggleField ariaLabel={ariaLabel()} field={props.field} />
        </SettingsFieldRow>
      );
    case "text":
    case "number":
      return (
        <SettingsFieldRow
          label={label()}
          hint={hint()}
          settingId={props.field.id}
          scopeTag={scopeTag()}
        >
          <InputField
            ariaLabel={ariaLabel()}
            field={props.field as RegisteredInputSetting}
          />
        </SettingsFieldRow>
      );
    case "color":
      return (
        <SettingsFieldRow
          label={label()}
          hint={hint()}
          settingId={props.field.id}
          scopeTag={scopeTag()}
        >
          <ColorField
            ariaLabel={ariaLabel()}
            field={props.field as RegisteredColorSetting}
          />
        </SettingsFieldRow>
      );
    case "action":
      return (
        <SettingsFieldRow
          label={label()}
          hint={hint()}
          settingId={props.field.id}
          scopeTag={scopeTag()}
        >
          <ActionField field={props.field as RegisteredActionSetting} />
        </SettingsFieldRow>
      );
    default:
      return null;
  }
}
