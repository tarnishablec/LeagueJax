import type { ZodType } from "zod";

export type SettingControlKind = "select" | "toggle" | "text" | "number";
export type SettingId = `${string}.${string}.${string}`;
export type SettingScope = "frontend" | "backend" | "shared";

export interface HydrateOptions {
  notify?: boolean;
  runOnSet?: boolean;
}

export type SettingsPatchSender = (changes: Record<string, unknown>) => void;

export interface SettingOption {
  value: string;
  labelKey: string;
  displayLabel?: string;
}

export interface SelectSettingControl {
  kind: "select";
}

export interface ToggleSettingControl {
  kind: "toggle";
}

export interface TextSettingControl {
  kind: "text";
  placeholderKey?: string;
}

export interface NumberSettingControl {
  kind: "number";
  placeholderKey?: string;
  min?: number;
  max?: number;
  step?: number;
}

export type SettingControl =
  | SelectSettingControl
  | ToggleSettingControl
  | TextSettingControl
  | NumberSettingControl;

interface SettingDefinitionBase<TControl extends SettingControl> {
  id: SettingId;
  labelKey: string;
  hintKey?: string;
  scope?: SettingScope;
  control: TControl;
  zod: ZodType;
  defaultValue: unknown;
  order?: number;
  visible?: boolean;
  onSet: (next: unknown, prev: unknown) => void;
}

export interface SelectSettingDefinition
  extends SettingDefinitionBase<SelectSettingControl> {
  options: SettingOption[];
}

export interface ToggleSettingDefinition
  extends SettingDefinitionBase<ToggleSettingControl> {}

export interface TextSettingDefinition
  extends SettingDefinitionBase<TextSettingControl> {}

export interface NumberSettingDefinition
  extends SettingDefinitionBase<NumberSettingControl> {}

export type InputSettingDefinition =
  | TextSettingDefinition
  | NumberSettingDefinition;

export type SettingDefinition =
  | SelectSettingDefinition
  | ToggleSettingDefinition
  | TextSettingDefinition
  | NumberSettingDefinition;

export type RegisteredSetting = SettingDefinition & {
  order: number;
  visible: boolean;
  declarationOrder: number;
};

export type SettingClassCtor = new () => object;

export interface SettingsReader {
  get<T = unknown>(id: SettingId): T;
  set<T = unknown>(id: SettingId, value: T): boolean;
  subscribe(id: SettingId, callback: () => void): () => void;
  listDefinitions(): RegisteredSetting[];
}

export interface SettingsShardApi extends SettingsReader {
  registerSetting(definition: SettingDefinition): void;
  registerClass(ctor: SettingClassCtor): void;
}
