/** @jsxImportSource solid-js */
import { createListCollection, Select } from "@ark-ui/solid/select";
import { keyArray } from "@solid-primitives/keyed";
import { Check, ChevronsUpDown } from "lucide-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import {
  type SettingsControlLayoutProps,
  settingsControlClassName,
  settingsControlStyle,
} from "./SettingsControl";
import * as s from "./SettingsSelect.css.ts";

export { createListCollection };

type SelectItem = {
  value: string;
  label: string;
};

type SelectGroup = {
  id?: string;
  label?: string;
  items: SelectItem[];
};

type SettingsSelectProps = SettingsControlLayoutProps & {
  collection: ReturnType<typeof createListCollection<SelectItem>>;
  value: string[];
  onValueChange: (details: { value: string[] }) => void;
  disabled?: boolean;
  placeholder?: string;
  formatValue?: (label: string) => string;
  groups?: SelectGroup[];
  disablePortal?: boolean;
};

function FormattedValueText(props: {
  formatValue: (label: string) => string;
  placeholder?: string;
}): JSX.Element {
  return (
    <Select.Context>
      {(api) => {
        const item = () => api().selectedItems[0] as SelectItem | undefined;
        const text = () =>
          item() ? props.formatValue(item()?.label ?? "") : props.placeholder;
        return <span class={s.valueText}>{text()}</span>;
      }}
    </Select.Context>
  );
}

function FlatItems(props: {
  collection: SettingsSelectProps["collection"];
}): JSX.Element {
  const items = keyArray(
    () => props.collection.items,
    (item) => item.value,
    (item) => (
      <Select.Item item={item()} class={s.item}>
        <Select.ItemText class={s.itemText}>{item().label}</Select.ItemText>
        <Select.ItemIndicator class={s.itemIndicator}>
          <Check size={13} />
        </Select.ItemIndicator>
      </Select.Item>
    ),
  );

  return <>{items()}</>;
}

function SelectGroupItems(props: {
  group: SelectGroup;
  collection: SettingsSelectProps["collection"];
}): JSX.Element {
  const items = keyArray(
    () => props.group.items,
    (groupItem) => groupItem.value,
    (groupItem) => {
      const item = () =>
        props.collection.items.find((i) => i.value === groupItem().value);
      return (
        <Show when={item()}>
          {(resolvedItem) => (
            <Select.Item item={resolvedItem()} class={s.item}>
              <Select.ItemText class={s.itemText}>
                {resolvedItem().label}
              </Select.ItemText>
              <Select.ItemIndicator class={s.itemIndicator}>
                <Check size={13} />
              </Select.ItemIndicator>
            </Select.Item>
          )}
        </Show>
      );
    },
  );

  return <>{items()}</>;
}

function GroupedItems(props: {
  groups: SelectGroup[];
  collection: SettingsSelectProps["collection"];
}): JSX.Element {
  const groups = keyArray(
    () => props.groups,
    (group) =>
      group.id ??
      group.label ??
      group.items.map((item) => item.value).join("|"),
    (group) => (
      <Select.ItemGroup class={s.group}>
        <SelectGroupItems group={group()} collection={props.collection} />
      </Select.ItemGroup>
    ),
  );

  return <>{groups()}</>;
}

export function SettingsSelect(props: SettingsSelectProps): JSX.Element {
  const listContent = () => (
    <Select.Positioner class={s.positioner}>
      <Select.Content class={s.content}>
        <Select.List class={s.list}>
          <Show
            when={props.groups}
            fallback={<FlatItems collection={props.collection} />}
          >
            {(groups) => (
              <GroupedItems groups={groups()} collection={props.collection} />
            )}
          </Show>
        </Select.List>
      </Select.Content>
    </Select.Positioner>
  );

  return (
    <Select.Root
      class={`${settingsControlClassName({
        className: props.className,
        fit: props.fit,
        size: props.size,
      })} ${s.root}`}
      style={
        settingsControlStyle({
          fit: props.fit,
          height: props.height,
          size: props.size,
          width: props.width,
        }) as unknown as JSX.CSSProperties
      }
      collection={props.collection}
      value={props.value}
      onValueChange={props.onValueChange}
      disabled={props.disabled}
      positioning={{
        sameWidth: true,
        placement: "bottom-start",
        gutter: 4,
      }}
    >
      <Select.HiddenSelect />
      <Select.Control class={s.control}>
        <Select.Trigger class={s.trigger}>
          <Show
            when={props.formatValue}
            fallback={
              <Select.ValueText
                class={s.valueText}
                placeholder={props.placeholder}
              />
            }
          >
            {(formatValue) => (
              <FormattedValueText
                formatValue={formatValue()}
                placeholder={props.placeholder}
              />
            )}
          </Show>
          <Select.Indicator class={s.indicator}>
            <ChevronsUpDown size={14} />
          </Select.Indicator>
        </Select.Trigger>
      </Select.Control>
      {props.disablePortal ? listContent() : <Portal>{listContent()}</Portal>}
    </Select.Root>
  );
}
