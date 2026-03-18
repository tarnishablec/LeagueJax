import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  SettingsFieldRow,
  SettingsInput,
  SettingsSelect,
  SettingsSwitch,
} from "@/components/settings-ui";
import type { RegisteredSetting, SettingId } from "@/features/settings/types";
import { settingsApi } from "../store";

type RegisteredSelectSetting = Extract<
  RegisteredSetting,
  { control: { kind: "select" } }
>;
type RegisteredInputSetting = Extract<
  RegisteredSetting,
  { control: { kind: "text" | "number" } }
>;

const useSettingValue = (id: SettingId): unknown => {
  return useSyncExternalStore(
    (onStoreChange) => settingsApi.subscribe(id, onStoreChange),
    () => settingsApi.get(id),
    () => settingsApi.get(id),
  );
};

const SelectField = ({
  ariaLabel,
  field,
}: {
  ariaLabel: string;
  field: RegisteredSelectSetting;
}) => {
  const { t } = useTranslation();
  const value = useSettingValue(field.id);
  const options = field.options.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  return (
    <SettingsSelect
      ariaLabel={ariaLabel}
      value={String(value ?? "")}
      options={options}
      onValueChange={(next) => {
        settingsApi.set(field.id, next);
      }}
    />
  );
};

const ToggleField = ({
  ariaLabel,
  field,
}: {
  ariaLabel: string;
  field: RegisteredSetting;
}) => {
  const value = useSettingValue(field.id);

  return (
    <SettingsSwitch
      ariaLabel={ariaLabel}
      checked={Boolean(value)}
      onCheckedChange={(checked) => {
        settingsApi.set(field.id, checked);
      }}
    />
  );
};

const InputField = ({
  ariaLabel,
  field,
}: {
  ariaLabel: string;
  field: RegisteredInputSetting;
}) => {
  const { t } = useTranslation();
  const value = useSettingValue(field.id);
  const inputType = field.control.kind === "number" ? "number" : "text";
  const numberControl =
    field.control.kind === "number" ? field.control : undefined;
  const placeholder = field.control.placeholderKey
    ? t(field.control.placeholderKey)
    : undefined;

  return (
    <SettingsInput
      ariaLabel={ariaLabel}
      type={inputType}
      value={String(value ?? "")}
      min={numberControl?.min}
      max={numberControl?.max}
      step={numberControl?.step}
      placeholder={placeholder}
      onValueChange={(next) => {
        if (field.control.kind === "number") {
          if (next.trim() === "") {
            return;
          }

          const parsed = Number(next);
          if (!Number.isNaN(parsed)) {
            settingsApi.set(field.id, parsed);
          }
          return;
        }

        settingsApi.set(field.id, next);
      }}
    />
  );
};

export function SettingsFieldRenderer({ field }: { field: RegisteredSetting }) {
  const { t } = useTranslation();
  const label = t(field.labelKey);
  const ariaLabel = `Setting ${field.id}`;

  if (!field.visible) {
    return null;
  }

  switch (field.control.kind) {
    case "select":
      return (
        <SettingsFieldRow label={label}>
          <SelectField
            ariaLabel={ariaLabel}
            field={field as RegisteredSelectSetting}
          />
        </SettingsFieldRow>
      );
    case "toggle":
      return (
        <SettingsFieldRow label={label}>
          <ToggleField ariaLabel={ariaLabel} field={field} />
        </SettingsFieldRow>
      );
    case "text":
    case "number":
      return (
        <SettingsFieldRow label={label}>
          <InputField
            ariaLabel={ariaLabel}
            field={field as RegisteredInputSetting}
          />
        </SettingsFieldRow>
      );
    default:
      return null;
  }
}
