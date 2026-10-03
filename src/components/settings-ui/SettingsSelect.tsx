/** @jsxImportSource solid-js */
import { createListCollection, Select } from "@ark-ui/solid/select";
import { keyArray } from "@solid-primitives/keyed";
import { Check, ChevronsUpDown } from "lucide-solid";
import type { JSX } from "solid-js";
import { children, Show, splitProps } from "solid-js";
import { Portal } from "solid-js/web";
import { visuallyHidden } from "@/styles/accessibility.css";
import {
  type SettingsControlProps,
  type SettingsControlSlotProps,
  settingsControlClassName,
  settingsControlLayoutKeys,
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

interface SettingsSelectOwnProps {
  ariaLabel: string;
  value: string[];
  onValueChange: NonNullable<Select.RootProps<SelectItem>["onValueChange"]>;
  placeholder?: string;
  formatValue?: (label: string) => string;
  triggerIcon?: JSX.Element;
  groups?: SelectGroup[];
  disablePortal?: boolean;
  triggerProps?: SettingsControlSlotProps<Select.TriggerProps>;
  hiddenSelectProps?: SettingsControlSlotProps<
    Select.HiddenSelectProps,
    | "value"
    | "defaultValue"
    | "name"
    | "form"
    | "disabled"
    | "required"
    | "multiple"
  >;
}

export type SettingsSelectProps = SettingsControlProps<
  Select.RootProps<SelectItem>,
  SettingsSelectOwnProps,
  "defaultValue"
>;

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

// Only named groups expose group semantics; unnamed groups are visual dividers
// and must not reference Ark's unrendered group label.
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
      <Show
        when={group().label}
        fallback={
          <div class={s.group}>
            <SelectGroupItems group={group()} collection={props.collection} />
          </div>
        }
      >
        {(label) => (
          <Select.ItemGroup class={s.group}>
            <Select.ItemGroupLabel class={visuallyHidden}>
              {label()}
            </Select.ItemGroupLabel>
            <SelectGroupItems group={group()} collection={props.collection} />
          </Select.ItemGroup>
        )}
      </Show>
    ),
  );

  return <>{groups()}</>;
}

// Ark links the trigger, native select and popup to one label. Keep that label
// mounted even when the popup is closed, without adding visible form chrome.
export function SettingsSelect(props: SettingsSelectProps): JSX.Element {
  const [layout, local, rootProps] = splitProps(
    props,
    settingsControlLayoutKeys,
    [
      "ariaLabel",
      "placeholder",
      "formatValue",
      "triggerIcon",
      "groups",
      "disablePortal",
      "triggerProps",
      "hiddenSelectProps",
    ],
  );
  // Resolve the slot once; checking it for layout must not mount extra tooltip
  // or icon component trees before the same content is inserted in the trigger.
  const triggerIcon = children(() => local.triggerIcon);
  const listContent = () => (
    <Select.Positioner class={s.positioner}>
      <Select.Content class={s.content}>
        <Select.List class={s.list}>
          <Show
            when={local.groups}
            fallback={<FlatItems collection={rootProps.collection} />}
          >
            {(groups) => (
              <GroupedItems
                groups={groups()}
                collection={rootProps.collection}
              />
            )}
          </Show>
        </Select.List>
      </Select.Content>
    </Select.Positioner>
  );

  return (
    <Select.Root
      {...rootProps}
      class={`${settingsControlClassName(layout)} ${s.root}`}
      style={settingsControlStyle(layout)}
      positioning={{
        sameWidth: true,
        placement: "bottom-start",
        gutter: 4,
        ...rootProps.positioning,
      }}
    >
      <Select.Label class={visuallyHidden}>{local.ariaLabel}</Select.Label>
      <Select.HiddenSelect {...local.hiddenSelectProps} />
      <Select.Control class={s.control}>
        <Select.Trigger
          {...local.triggerProps}
          class={s.trigger({ iconOnly: Boolean(triggerIcon()) })}
        >
          <Show
            when={triggerIcon()}
            fallback={
              <>
                <Show
                  when={local.formatValue}
                  fallback={
                    <Select.ValueText
                      class={s.valueText}
                      placeholder={local.placeholder}
                    />
                  }
                >
                  {(formatValue) => (
                    <FormattedValueText
                      formatValue={formatValue()}
                      placeholder={local.placeholder}
                    />
                  )}
                </Show>
                <Select.Indicator class={s.indicator}>
                  <ChevronsUpDown size={14} />
                </Select.Indicator>
              </>
            }
          >
            {triggerIcon()}
          </Show>
        </Select.Trigger>
      </Select.Control>
      {local.disablePortal ? listContent() : <Portal>{listContent()}</Portal>}
    </Select.Root>
  );
}
