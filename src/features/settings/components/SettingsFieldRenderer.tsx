import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  createListCollection,
  SettingsFieldRow,
  SettingsInput,
  SettingsSelect,
  SettingsToggle,
} from "@/components/settings-ui";
import { useSettings } from "@/features/settings/context";
import type {
  RegisteredSetting,
  SettingId,
  SettingScope,
} from "@/features/settings/types";

type RegisteredSelectSetting = Extract<
  RegisteredSetting,
  { control: { kind: "select" } }
>;
type RegisteredInputSetting = Extract<
  RegisteredSetting,
  { control: { kind: "text" | "number" } }
>;

const useSettingValue = (id: SettingId): unknown => {
  const settings = useSettings();
  return useSyncExternalStore(
    (onStoreChange) => settings.subscribe(id, onStoreChange),
    () => settings.get(id),
    () => settings.get(id),
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
  const settings = useSettings();
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
        if (next != null) settings.set(field.id, next);
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
  const settings = useSettings();
  const value = useSettingValue(field.id);

  return (
    <SettingsToggle
      ariaLabel={ariaLabel}
      checked={Boolean(value)}
      onCheckedChange={(checked) => {
        settings.set(field.id, checked);
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
  const settings = useSettings();
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
      min={numberControl?.min ?? undefined}
      max={numberControl?.max ?? undefined}
      step={numberControl?.step ?? undefined}
      placeholder={placeholder}
      onValueChange={(next) => {
        if (field.control.kind === "number") {
          if (next.trim() === "") {
            return;
          }

          const parsed = Number(next);
          if (!Number.isNaN(parsed)) {
            settings.set(field.id, parsed);
          }
          return;
        }

        settings.set(field.id, next);
      }}
    />
  );
};

export function SettingsFieldRenderer({ field }: { field: RegisteredSetting }) {
  const { t } = useTranslation();
  const label = t(field.labelKey);
  const hint = field.hintKey ? t(field.hintKey) : undefined;
  const ariaLabel = `Setting ${field.id}`;
  const scopeTag = toScopeTag(field.scope);

  if (!field.visible) {
    return null;
  }

  switch (field.control.kind) {
    case "select":
      return (
        <SettingsFieldRow label={label} hint={hint} scopeTag={scopeTag}>
          <SelectField field={field as RegisteredSelectSetting} />
        </SettingsFieldRow>
      );
    case "toggle":
      return (
        <SettingsFieldRow label={label} hint={hint} scopeTag={scopeTag}>
          <ToggleField ariaLabel={ariaLabel} field={field} />
        </SettingsFieldRow>
      );
    case "text":
    case "number":
      return (
        <SettingsFieldRow label={label} hint={hint} scopeTag={scopeTag}>
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
