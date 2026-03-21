import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  createListCollection,
  SettingsFieldRow,
  SettingsInput,
  SettingsSelect,
  SettingsSwitch,
} from "@/components/settings-ui";
import type {
  RegisteredSetting,
  SettingId,
  SettingScope,
} from "@/features/settings/types";
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

const SelectField = ({ field }: { field: RegisteredSelectSetting }) => {
  const { t } = useTranslation();
  const value = useSettingValue(field.id);
  const collection = useMemo(
    () =>
      createListCollection({
        items: field.options.map((option) => ({
          value: option.value,
          label: option.displayLabel ?? t(option.labelKey),
        })),
      }),
    [field.options, t],
  );

  return (
    <SettingsSelect
      collection={collection}
      value={[String(value ?? "")]}
      onValueChange={(details) => {
        const next = details.value[0];
        if (next != null) settingsApi.set(field.id, next);
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
  const scopeTag = toScopeTag(field.scope);

  if (!field.visible) {
    return null;
  }

  switch (field.control.kind) {
    case "select":
      return (
        <SettingsFieldRow label={label} scopeTag={scopeTag}>
          <SelectField field={field as RegisteredSelectSetting} />
        </SettingsFieldRow>
      );
    case "toggle":
      return (
        <SettingsFieldRow label={label} scopeTag={scopeTag}>
          <ToggleField ariaLabel={ariaLabel} field={field} />
        </SettingsFieldRow>
      );
    case "text":
    case "number":
      return (
        <SettingsFieldRow label={label} scopeTag={scopeTag}>
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
