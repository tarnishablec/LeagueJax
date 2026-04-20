import { invoke } from "@tauri-apps/api/core";
import { type ZodType, z } from "zod";
import { createStore } from "zustand/vanilla";
import type {
  SettingDefinitionDto,
  SettingsSnapshotDto,
} from "@/bindings/settings.ts";
import type {
  HydrateOptions,
  RegisteredSetting,
  SettingClassCtor,
  SettingDefinition,
  SettingId,
  SettingsPatchSender,
  SettingsSectionKey,
  SettingsSectionRenderer,
} from "@/features/settings/types";
import { AppError, type AppThatError } from "@/infra/errors";
import { createLogger } from "@/infra/logger";

interface SettingsState {
  values: Record<string, unknown>;
}

type DecoratedFieldDefinition = SettingDefinition;

const settingIdRegex = /^[^.]+\.[^.]+\.[^.]+$/;
const settingOptionSchema = z
  .object({
    value: z.string().min(1),
    labelKey: z.string().min(1),
    displayLabel: z.string().min(1).optional(),
  })
  .strict();

const settingScopeSchema = z.enum(["frontend", "backend", "shared"]).optional();

const zodSchemaValueSchema = z.custom<ZodType>(
  (value) => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const candidate = value as { safeParse?: unknown };
    return typeof candidate.safeParse === "function";
  },
  { message: "zod must be a valid Zod schema instance." },
);

const onSetValueSchema = z.custom<(next: unknown, prev: unknown) => void>(
  (value) => typeof value === "function",
  {
    message: "onSet must be a function.",
  },
);

const sharedDefinitionShape = {
  id: z.string().regex(settingIdRegex, 'id must match "page.section.field".'),
  labelKey: z.string().min(1),
  hintKey: z.string().min(1).optional(),
  scope: settingScopeSchema,
  zod: zodSchemaValueSchema,
  defaultValue: z.unknown(),
  order: z.number().int().optional(),
  visible: z.boolean().optional(),
  onSet: onSetValueSchema,
};

const selectSettingDefinitionSchema = z
  .object({
    ...sharedDefinitionShape,
    control: z.object({ kind: z.literal("select") }).strict(),
    options: z.array(settingOptionSchema).min(1),
  })
  .strict();

const toggleSettingDefinitionSchema = z
  .object({
    ...sharedDefinitionShape,
    control: z.object({ kind: z.literal("toggle") }).strict(),
  })
  .strict();

const textSettingDefinitionSchema = z
  .object({
    ...sharedDefinitionShape,
    control: z
      .object({
        kind: z.literal("text"),
        placeholderKey: z.string().optional(),
      })
      .strict(),
  })
  .strict();

const numberSettingDefinitionSchema = z
  .object({
    ...sharedDefinitionShape,
    control: z
      .object({
        kind: z.literal("number"),
        placeholderKey: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
      })
      .strict(),
  })
  .strict();

const onActionValueSchema = z.custom<() => void>(
  (value) => typeof value === "function",
  { message: "onAction must be a function." },
);

const actionSettingDefinitionSchema = z
  .object({
    ...sharedDefinitionShape,
    control: z.object({ kind: z.literal("action") }).strict(),
    onAction: onActionValueSchema,
  })
  .strict();

const settingDefinitionSchema = z.union([
  selectSettingDefinitionSchema,
  toggleSettingDefinitionSchema,
  textSettingDefinitionSchema,
  numberSettingDefinitionSchema,
  actionSettingDefinitionSchema,
]);

const settingsClasses = new WeakSet<SettingClassCtor>();
const classFieldDefinitions = new WeakMap<
  SettingClassCtor,
  DecoratedFieldDefinition[]
>();

function settingClassName(ctor: SettingClassCtor): string {
  return ctor.name || "AnonymousSettingsClass";
}

function isSettingId(value: string): value is SettingId {
  return settingIdRegex.test(value);
}

function definitionSignature(definition: SettingDefinition): string {
  const normalized = {
    id: definition.id,
    labelKey: definition.labelKey,
    hintKey: definition.hintKey ?? null,
    scope: definition.scope ?? "frontend",
    control: definition.control,
    defaultValue: definition.defaultValue,
    order: definition.order ?? 99,
    visible: definition.visible ?? true,
    options: "options" in definition ? definition.options : undefined,
  };
  return JSON.stringify(normalized);
}

function buildRemoteZod(
  control: SettingDefinitionDto["control"],
  remoteOptions: { value: string; labelKey: string }[],
): ZodType {
  switch (control.kind) {
    case "toggle":
      return z.boolean();
    case "text":
      return z.string();
    case "number":
      return z.number();
    case "select": {
      if (remoteOptions.length === 0) {
        return z.string();
      }
      const values = [...new Set(remoteOptions.map((option) => option.value))];
      const [first, ...rest] = values;
      if (!first) {
        return z.string();
      }
      return z.enum([first, ...rest] as [string, ...string[]]);
    }
    case "action":
      return z.null();
    default:
      return z.unknown();
  }
}

export function settings(
  value: SettingClassCtor,
  _context: ClassDecoratorContext,
): void {
  settingsClasses.add(value);
}

export function setting(definition: SettingDefinition) {
  return function registerDecorator(
    _value: undefined,
    context: ClassFieldDecoratorContext<object, unknown>,
  ): void {
    if (context.kind !== "field") {
      return;
    }

    context.addInitializer(function init(this: object) {
      const ctor = (this as { constructor?: SettingClassCtor }).constructor;
      if (!ctor) {
        return;
      }

      const current = classFieldDefinitions.get(ctor) ?? [];

      const exists = current.some((item) => item.id === definition.id);
      if (exists) {
        return;
      }

      current.push(definition);
      classFieldDefinitions.set(ctor, current);
    });
  };
}

class SettingsStore {
  private readonly store = createStore<SettingsState>()(() => ({
    values: {},
  }));

  private readonly registeredClasses = new WeakSet<SettingClassCtor>();
  private readonly registeredDefinitions = new Map<
    SettingId,
    RegisteredSetting
  >();
  private readonly fieldSubscribers = new Map<SettingId, Set<() => void>>();
  private readonly sectionRenderers = new Map<
    SettingsSectionKey,
    SettingsSectionRenderer
  >();
  private declarationSequence = 0;
  private remotePatchSender: SettingsPatchSender | null = null;
  private readonly logger = createLogger("settings-store");

  private reportRegistrationError(error: AppThatError): void {
    if (import.meta.env.DEV) {
      throw error;
    }
    this.logger.error({ error }, error.message);
  }

  private getFieldSubscribers(id: SettingId): Set<() => void> {
    const existing = this.fieldSubscribers.get(id);
    if (existing) {
      return existing;
    }
    const created = new Set<() => void>();
    this.fieldSubscribers.set(id, created);
    return created;
  }

  private notifySubscribers(id: SettingId): void {
    const subscribers = this.fieldSubscribers.get(id);
    if (!subscribers) {
      return;
    }
    for (const callback of subscribers) {
      callback();
    }
  }

  private updateRawValue(id: string, value: unknown): boolean {
    const current = this.store.getState().values[id];
    if (Object.is(current, value)) {
      return false;
    }

    this.store.setState((state) => ({
      ...state,
      values: {
        ...state.values,
        [id]: value,
      },
    }));
    return true;
  }

  private applyParsedValue(
    id: SettingId,
    definition: RegisteredSetting,
    parsedValue: unknown,
    options: Required<HydrateOptions>,
  ): boolean {
    const previous = this.get(id);
    const updated = this.updateRawValue(id, parsedValue);
    if (!updated) {
      return false;
    }

    if (options.runOnSet) {
      definition.onSet(parsedValue, previous);
    }
    if (options.notify) {
      this.notifySubscribers(id);
    }

    return true;
  }

  private normalizeDefinition(
    definition: SettingDefinition,
  ): RegisteredSetting {
    return {
      ...definition,
      order: definition.order ?? 99,
      visible: definition.visible ?? true,
      declarationOrder: this.declarationSequence++,
    };
  }

  private registerDefinition(definition: SettingDefinition): void {
    const parsedDefinition = settingDefinitionSchema.safeParse(definition);
    if (!parsedDefinition.success) {
      const issue = parsedDefinition.error.issues[0];
      this.reportRegistrationError(
        AppError.SettingsRegistration(
          `Invalid setting definition: ${issue?.message ?? "unknown error"}.`,
        ),
      );
      return;
    }

    const validatedDefinition = parsedDefinition.data as SettingDefinition;

    const defaultValueParsed = validatedDefinition.zod.safeParse(
      validatedDefinition.defaultValue,
    );
    if (!defaultValueParsed.success) {
      this.reportRegistrationError(
        AppError.SettingsRegistration(
          `Default value for "${validatedDefinition.id}" does not match its zod schema.`,
        ),
      );
      return;
    }

    const existing = this.registeredDefinitions.get(validatedDefinition.id);
    if (existing) {
      const compatible =
        definitionSignature(existing) ===
        definitionSignature(validatedDefinition);
      if (!compatible) {
        this.reportRegistrationError(
          AppError.SettingsRegistration(
            `Duplicate setting id "${validatedDefinition.id}" was registered.`,
          ),
        );
      }
      return;
    }

    const normalized = this.normalizeDefinition(validatedDefinition);
    this.registeredDefinitions.set(validatedDefinition.id, normalized);

    const existingValue = this.store.getState().values[validatedDefinition.id];
    if (existingValue === undefined) {
      this.updateRawValue(validatedDefinition.id, normalized.defaultValue);
    }
  }

  private buildRemoteOnSet(
    _id: string,
  ): (next: unknown, prev: unknown) => void {
    return () => {};
  }

  private registerRemoteDefinition(definition: SettingDefinitionDto): void {
    if (!isSettingId(definition.id)) {
      this.logger.warn(
        { id: definition.id },
        "Skip remote setting with invalid id",
      );
      return;
    }

    const remoteOptions = (definition.options ?? []).map((option) => ({
      value: option.value,
      labelKey: option.labelKey,
      displayLabel: option.displayLabel ?? undefined,
    }));

    const shared = {
      id: definition.id,
      labelKey: definition.labelKey,
      hintKey: definition.hintKey ?? undefined,
      scope: definition.scope,
      zod: buildRemoteZod(definition.control, remoteOptions),
      defaultValue: definition.defaultValue,
      order: definition.order ?? undefined,
      visible: definition.visible ?? undefined,
      onSet: this.buildRemoteOnSet(definition.id),
    } as const;

    let mapped: SettingDefinition;
    switch (definition.control.kind) {
      case "select":
        mapped = {
          ...shared,
          control: { kind: "select" },
          options: remoteOptions,
        };
        break;
      case "toggle":
        mapped = {
          ...shared,
          control: { kind: "toggle" },
        };
        break;
      case "text":
        mapped = {
          ...shared,
          control: {
            kind: "text",
            placeholderKey: definition.control.placeholderKey ?? undefined,
          },
        };
        break;
      case "number":
        mapped = {
          ...shared,
          control: {
            kind: "number",
            placeholderKey: definition.control.placeholderKey ?? undefined,
            min: definition.control.min ?? undefined,
            max: definition.control.max ?? undefined,
            step: definition.control.step ?? undefined,
          },
        };
        break;
      case "action":
        mapped = {
          ...shared,
          control: { kind: "action" },
          onAction: async () => {
            await invoke("execute_setting_action", { id: definition.id });
          },
        };
        break;
      default:
        return;
    }

    this.registerDefinition(mapped);
  }

  public registerSetting(definition: SettingDefinition): void {
    this.registerDefinition(definition);
  }

  public registerClass(ctor: SettingClassCtor): void {
    if (!settingsClasses.has(ctor)) {
      this.reportRegistrationError(
        AppError.SettingsRegistration(
          `Class "${settingClassName(ctor)}" must use @settings before registerClass.`,
        ),
      );
      return;
    }

    if (this.registeredClasses.has(ctor)) {
      return;
    }

    void new ctor();
    const definitions = classFieldDefinitions.get(ctor) ?? [];

    for (const definition of definitions) {
      this.registerDefinition(definition);
    }

    this.registeredClasses.add(ctor);
  }

  public get<T = unknown>(id: SettingId): T {
    const stateValue = this.store.getState().values[id];
    if (stateValue !== undefined) {
      return stateValue as T;
    }

    const definition = this.registeredDefinitions.get(id);
    if (definition) {
      return definition.defaultValue as T;
    }

    return undefined as T;
  }

  public set<T = unknown>(id: SettingId, value: T): boolean {
    const definition = this.registeredDefinitions.get(id);
    if (!definition) {
      return false;
    }

    const parsed = definition.zod.safeParse(value);
    if (!parsed.success) {
      return false;
    }

    const updated = this.applyParsedValue(id, definition, parsed.data, {
      notify: true,
      runOnSet: true,
    });
    if (updated) {
      this.remotePatchSender?.({ [id]: parsed.data });
    }
    return true;
  }

  public subscribe(id: SettingId, callback: () => void): () => void {
    const subscribers = this.getFieldSubscribers(id);
    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.fieldSubscribers.delete(id);
      }
    };
  }

  public listDefinitions(): RegisteredSetting[] {
    return [...this.registeredDefinitions.values()].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.declarationOrder - b.declarationOrder;
    });
  }

  public registerSectionRenderer(
    key: SettingsSectionKey,
    renderer: SettingsSectionRenderer,
  ): void {
    this.sectionRenderers.set(key, renderer);
  }

  public getSectionRenderer(
    key: SettingsSectionKey,
  ): SettingsSectionRenderer | undefined {
    return this.sectionRenderers.get(key);
  }

  public mergeRemoteDefinitions(definitions: SettingDefinitionDto[]): void {
    for (const definition of definitions) {
      this.registerRemoteDefinition(definition);
    }
  }

  public hydrateFromSnapshot(
    snapshot: SettingsSnapshotDto,
    options?: HydrateOptions,
  ): void {
    const effective: Required<HydrateOptions> = {
      notify: options?.notify ?? false,
      runOnSet: options?.runOnSet ?? false,
    };

    for (const [rawId, rawValue] of Object.entries(snapshot.values)) {
      if (!isSettingId(rawId)) {
        this.updateRawValue(rawId, rawValue);
        continue;
      }

      const definition = this.registeredDefinitions.get(rawId);
      if (!definition) {
        this.updateRawValue(rawId, rawValue);
        continue;
      }

      const parsed = definition.zod.safeParse(rawValue);
      if (!parsed.success) {
        this.logger.warn(
          { id: rawId },
          "Skip snapshot value because it does not match setting schema",
        );
        continue;
      }

      this.applyParsedValue(rawId, definition, parsed.data, effective);
    }
  }

  public applyRemotePatch(changes: Record<string, unknown>): void {
    for (const [rawId, rawValue] of Object.entries(changes)) {
      if (!isSettingId(rawId)) {
        this.updateRawValue(rawId, rawValue);
        continue;
      }

      const definition = this.registeredDefinitions.get(rawId);
      if (!definition) {
        const updated = this.updateRawValue(rawId, rawValue);
        if (updated) {
          this.notifySubscribers(rawId);
        }
        continue;
      }

      const parsed = definition.zod.safeParse(rawValue);
      if (!parsed.success) {
        this.logger.warn(
          { id: rawId },
          "Skip remote patch value because it does not match setting schema",
        );
        continue;
      }

      this.applyParsedValue(rawId, definition, parsed.data, {
        notify: true,
        runOnSet: true,
      });
    }
  }

  public configureRemotePatchSender(sender: SettingsPatchSender | null): void {
    this.remotePatchSender = sender;
  }
}

export { SettingsStore };
