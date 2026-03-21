import { createListCollection, Select } from "@ark-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import * as s from "./SettingsSelect.css";

export { createListCollection };

type SelectItem = {
  value: string;
  label: string;
};

type SettingsSelectProps = {
  collection: ReturnType<typeof createListCollection<SelectItem>>;
  value: string[];
  onValueChange: (details: Select.ValueChangeDetails<SelectItem>) => void;
  disabled?: boolean;
  placeholder?: string;
  formatValue?: (label: string) => string;
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

export function SettingsSelect({
  collection,
  value,
  onValueChange,
  disabled,
  placeholder,
  formatValue,
}: SettingsSelectProps) {
  return (
    <Select.Root
      className={s.root}
      collection={collection}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      positioning={{ sameWidth: true, placement: "bottom-start", gutter: 4 }}
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
      <Select.Positioner className={s.positioner}>
        <Select.Content className={s.content}>
          <Select.List className={s.list}>
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item} className={s.item}>
                <Select.ItemText className={s.itemText}>
                  {item.label}
                </Select.ItemText>
                <Select.ItemIndicator className={s.itemIndicator}>
                  <Check size={13} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.List>
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}
