import { Portal } from "@ark-ui/react/portal";
import { createListCollection, Select } from "@ark-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  type SettingsControlLayoutProps,
  settingsControlClassName,
  settingsControlStyle,
} from "./SettingsControl";
import * as s from "./SettingsSelect.css";

export { createListCollection };

type SelectItem = {
  value: string;
  label: string;
};

type SelectGroup = {
  label: string;
  items: SelectItem[];
};

type SettingsSelectProps = SettingsControlLayoutProps & {
  collection: ReturnType<typeof createListCollection<SelectItem>>;
  value: string[];
  onValueChange: (details: Select.ValueChangeDetails<SelectItem>) => void;
  disabled?: boolean;
  placeholder?: string;
  formatValue?: (label: string) => string;
  groups?: SelectGroup[];
  disablePortal?: boolean;
};

function FormattedValueText({
  formatValue,
  placeholder,
}: {
  formatValue: (label: string) => string;
  placeholder?: string;
}) {
  return (
    <Select.Context>
      {(api) => {
        const item = api.selectedItems[0] as SelectItem | undefined;
        const text = item ? formatValue(item.label) : placeholder;
        return <span className={s.valueText}>{text}</span>;
      }}
    </Select.Context>
  );
}

function FlatItems({
  collection,
}: {
  collection: SettingsSelectProps["collection"];
}) {
  return (
    <>
      {collection.items.map((item) => (
        <Select.Item key={item.value} item={item} className={s.item}>
          <Select.ItemText className={s.itemText}>{item.label}</Select.ItemText>
          <Select.ItemIndicator className={s.itemIndicator}>
            <Check size={13} />
          </Select.ItemIndicator>
        </Select.Item>
      ))}
    </>
  );
}

function GroupedItems({
  groups,
  collection,
}: {
  groups: SelectGroup[];
  collection: SettingsSelectProps["collection"];
}) {
  return (
    <>
      {groups.map((group) => (
        <Select.ItemGroup key={group.label} className={s.group}>
          {group.items.map((groupItem) => {
            const item = collection.items.find(
              (i) => i.value === groupItem.value,
            );
            if (!item) return null;
            return (
              <Select.Item key={item.value} item={item} className={s.item}>
                <Select.ItemText className={s.itemText}>
                  {item.label}
                </Select.ItemText>
                <Select.ItemIndicator className={s.itemIndicator}>
                  <Check size={13} />
                </Select.ItemIndicator>
              </Select.Item>
            );
          })}
        </Select.ItemGroup>
      ))}
    </>
  );
}

export function SettingsSelect({
  className,
  collection,
  value,
  fit,
  height,
  onValueChange,
  size,
  width,
  disabled,
  placeholder,
  formatValue,
  groups,
  disablePortal,
}: SettingsSelectProps) {
  const listContent = (
    <Select.Positioner className={s.positioner}>
      <Select.Content className={s.content}>
        <Select.List className={s.list}>
          {groups ? (
            <GroupedItems groups={groups} collection={collection} />
          ) : (
            <FlatItems collection={collection} />
          )}
        </Select.List>
      </Select.Content>
    </Select.Positioner>
  );

  return (
    <Select.Root
      className={`${settingsControlClassName({ className, fit, size })} ${s.root}`}
      style={settingsControlStyle({ fit, height, size, width })}
      collection={collection}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      positioning={{
        sameWidth: true,
        placement: "bottom-start",
        gutter: 4,
      }}
    >
      <Select.HiddenSelect />
      <Select.Control className={s.control}>
        <Select.Trigger className={s.trigger}>
          {formatValue ? (
            <FormattedValueText
              formatValue={formatValue}
              placeholder={placeholder}
            />
          ) : (
            <Select.ValueText
              className={s.valueText}
              placeholder={placeholder}
            />
          )}
          <Select.Indicator className={s.indicator}>
            <ChevronsUpDown size={14} />
          </Select.Indicator>
        </Select.Trigger>
      </Select.Control>
      {disablePortal ? listContent : <Portal>{listContent}</Portal>}
    </Select.Root>
  );
}
