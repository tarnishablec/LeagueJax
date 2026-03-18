import { Portal } from "@ark-ui/react/portal";
import { createListCollection, Select } from "@ark-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useMemo } from "react";
import * as s from "./SettingsSelect.css";

interface SettingsSelectOption {
  value: string;
  label: string;
}

interface SettingsSelectProps {
  ariaLabel: string;
  value: string;
  options: SettingsSelectOption[];
  onValueChange: (value: string) => void;
}

export function SettingsSelect({
  ariaLabel,
  value,
  options,
  onValueChange,
}: SettingsSelectProps) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: options,
        itemToValue: (item) => item.value,
        itemToString: (item) => item.label,
      }),
    [options],
  );

  const selectedValue = useMemo(() => {
    if (options.some((option) => option.value === value)) {
      return value;
    }
    return options[0]?.value ?? "";
  }, [options, value]);

  return (
    <Select.Root
      aria-label={ariaLabel}
      className={s.root}
      collection={collection}
      value={selectedValue ? [selectedValue] : []}
      positioning={{ sameWidth: true, placement: "bottom-start", gutter: 4 }}
      onValueChange={(details) => {
        const next = details.value[0];
        if (next) {
          onValueChange(next);
        }
      }}
    >
      <Select.HiddenSelect />
      <Select.Control className={s.control}>
        <Select.Trigger className={s.trigger}>
          <Select.ValueText className={s.value} />
          <Select.Indicator className={s.indicator}>
            <ChevronDown size={14} aria-hidden="true" />
          </Select.Indicator>
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner className={s.positioner}>
          <Select.Content className={s.content}>
            <Select.List className={s.list}>
              {collection.items.map((item) => (
                <Select.Item key={item.value} item={item} className={s.item}>
                  <Select.ItemText className={s.itemText}>
                    {item.label}
                  </Select.ItemText>
                  <Select.ItemIndicator className={s.itemIndicator}>
                    <Check size={13} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}
