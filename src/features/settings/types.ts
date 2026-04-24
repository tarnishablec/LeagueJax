import type React from "react";
import type { ZodType } from "zod";
import type { SettingScopeDto } from "@/bindings/settings";

// ── Re-export from Rust DTO ─────────────────────────────────────────────────
export type SettingScope = SettingScopeDto;

// ── Frontend-adapted data types (null → optional for JS ergonomics) ─────────
export interface SettingOption {
  value: string;
  labelKey: string;
  displayLabel?: string;
}

export type SettingControl =
  | { kind: "select" }
  | { kind: "toggle" }
  | { kind: "text"; placeholderKey?: string }
  | {
      kind: "number";
      placeholderKey?: string;
      min?: number;
      max?: number;
      step?: number;
    }
  | { kind: "action" };

// ── Frontend-only types ──────────────────────────────────────────────────────
export type SettingId = `${string}.${string}.${string}`;
export type SettingsSectionKey = `${string}.${string}`;

export interface HydrateOptions {
  notify?: boolean;
  runOnSet?: boolean;
}

export type SettingsPatchSender = (changes: Record<string, unknown>) => void;
export type AsyncSettingAction = () => Promise<void>;

export interface SettingsSectionRendererProps {
  pageId: string;
  sectionId: string;
  fields: RegisteredSetting[];
}

export type SettingsSectionRenderer = (
  props: SettingsSectionRendererProps,
) => React.ReactElement;

/**
 * Frontend-enriched setting definition.
 * Shares the same field names as the Rust `SettingDefinitionDto` for data fields,
 * with added runtime-only fields (`zod`, `onSet`).
 * Nullable DTO fields are narrowed to optional for JS ergonomics.
 */
interface SettingDefinitionBase {
  id: SettingId;
  labelKey: string;
  hintKey?: string;
  scope?: SettingScope;
  control: SettingControl;
  defaultValue: unknown;
  order?: number;
  visible?: boolean;
  zod: ZodType;
  onSet: (next: unknown, prev: unknown) => void;
}

export interface SelectSettingDefinition extends SettingDefinitionBase {
  control: Extract<SettingControl, { kind: "select" }>;
  options: SettingOption[];
}

export interface ToggleSettingDefinition extends SettingDefinitionBase {
  control: Extract<SettingControl, { kind: "toggle" }>;
}

export interface TextSettingDefinition extends SettingDefinitionBase {
  control: Extract<SettingControl, { kind: "text" }>;
}

export interface NumberSettingDefinition extends SettingDefinitionBase {
  control: Extract<SettingControl, { kind: "number" }>;
}

export interface ActionSettingDefinition extends SettingDefinitionBase {
  control: Extract<SettingControl, { kind: "action" }>;
  onAction: AsyncSettingAction;
}

export type InputSettingDefinition =
  | TextSettingDefinition
  | NumberSettingDefinition;

export type SettingDefinition =
  | SelectSettingDefinition
  | ToggleSettingDefinition
  | TextSettingDefinition
  | NumberSettingDefinition
  | ActionSettingDefinition;

export type RegisteredSetting = SettingDefinition & {
  order: number;
  visible: boolean;
  declarationOrder: number;
};

export type SettingClassCtor = new () => object;

export interface SettingsReader {
  get<T = unknown>(id: SettingId): T;
  set<T = unknown>(id: SettingId, value: T): boolean;
  reset(ids?: SettingId[]): boolean;
  subscribe(id: SettingId, callback: () => void): () => void;
  listDefinitions(): RegisteredSetting[];
  getSectionRenderer(
    key: SettingsSectionKey,
  ): SettingsSectionRenderer | undefined;
}

export interface SettingsShardApi extends SettingsReader {
  registerSetting(definition: SettingDefinition): void;
  registerClass(ctor: SettingClassCtor): void;
  registerSectionRenderer(
    key: SettingsSectionKey,
    renderer: SettingsSectionRenderer,
  ): void;
}
