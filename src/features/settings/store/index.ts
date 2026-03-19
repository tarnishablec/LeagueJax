import { type ZodType, z } from "zod";
import { createStore } from "zustand/vanilla";
import type {
  SettingControlDto,
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
  SettingsShardApi,
} from "@/features/settings/types";
import { AppError, type AppThatError } from "@/infra/errors";
import { createLogger, setWebLogLevel } from "@/infra/logger";

interface SettingsState {
  values: Record<string, unknown>;
  version: number;
}

type DecoratedFieldDefinition = SettingDefinition;

const settingsStateStore = createStore<SettingsState>()(() => ({
  values: {},
  version: 0,
}));

const settingsClasses = new WeakSet<SettingClassCtor>();
const classFieldDefinitions = new WeakMap<
  SettingClassCtor,
  DecoratedFieldDefinition[]
>();
const registeredClasses = new WeakSet<SettingClassCtor>();
const registeredDefinitions = new Map<SettingId, RegisteredSetting>();
const fieldSubscribers = new Map<SettingId, Set<() => void>>();

let declarationSequence = 0;
let remotePatchSender: SettingsPatchSender | null = null;
const logger = createLogger("settings-store");

const settingIdRegex = /^[^.]+\.[^.]+\.[^.]+$/;
const SHARED_LOG_LEVEL_SETTING_ID = "system.logging.level";
const settingOptionSchema = z
  .object({
    value: z.string().min(1),
    labelKey: z.string().min(1),
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

const settingDefinitionSchema = z.union([
  selectSettingDefinitionSchema,
  toggleSettingDefinitionSchema,
  textSettingDefinitionSchema,
  numberSettingDefinitionSchema,
]);

function reportRegistrationError(error: AppThatError): void {
  if (import.meta.env.DEV) {
    throw error;
  }
  logger.error({ error }, error.message);
}

function settingClassName(ctor: SettingClassCtor): string {
  return ctor.name || "AnonymousSettingsClass";
}

function getFieldSubscribers(id: SettingId): Set<() => void> {
  const existing = fieldSubscribers.get(id);
  if (existing) {
    return existing;
  }
  const created = new Set<() => void>();
  fieldSubscribers.set(id, created);
  return created;
}

function notifySubscribers(id: SettingId): void {
  const subscribers = fieldSubscribers.get(id);
  if (!subscribers) {
    return;
  }
  for (const callback of subscribers) {
    callback();
  }
}

function isSettingId(value: string): value is SettingId {
  return settingIdRegex.test(value);
}

function updateVersion(version: number): void {
  settingsStateStore.setState((state) => ({
    ...state,
    version,
  }));
}

function updateRawValue(id: string, value: unknown): boolean {
  const current = settingsStateStore.getState().values[id];
  if (Object.is(current, value)) {
    return false;
  }

  settingsStateStore.setState((state) => ({
    ...state,
    values: {
      ...state.values,
      [id]: value,
    },
  }));
  return true;
}

function definitionSignature(definition: SettingDefinition): string {
  const normalized = {
    id: definition.id,
    labelKey: definition.labelKey,
    scope: definition.scope ?? "frontend",
    control: definition.control,
    defaultValue: definition.defaultValue,
    order: definition.order ?? 99,
    visible: definition.visible ?? true,
    options: "options" in definition ? definition.options : undefined,
  };
  return JSON.stringify(normalized);
}

function applyParsedValue(
  id: SettingId,
  definition: RegisteredSetting,
  parsedValue: unknown,
  options: Required<HydrateOptions>,
): boolean {
  const previous = get(id);
  const updated = updateRawValue(id, parsedValue);
  if (!updated) {
    return false;
  }

  if (options.runOnSet) {
    definition.onSet(parsedValue, previous);
  }
  if (options.notify) {
    notifySubscribers(id);
  }

  return true;
}

function normalizeDefinition(definition: SettingDefinition): RegisteredSetting {
  return {
    ...definition,
    order: definition.order ?? 99,
    visible: definition.visible ?? true,
    declarationOrder: declarationSequence++,
  };
}

function registerDefinition(definition: SettingDefinition): void {
  const parsedDefinition = settingDefinitionSchema.safeParse(definition);
  if (!parsedDefinition.success) {
    const issue = parsedDefinition.error.issues[0];
    reportRegistrationError(
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
    reportRegistrationError(
      AppError.SettingsRegistration(
        `Default value for "${validatedDefinition.id}" does not match its zod schema.`,
      ),
    );
    return;
  }

  const existing = registeredDefinitions.get(validatedDefinition.id);
  if (existing) {
    const compatible =
      definitionSignature(existing) ===
      definitionSignature(validatedDefinition);
    if (!compatible) {
      reportRegistrationError(
        AppError.SettingsRegistration(
          `Duplicate setting id "${validatedDefinition.id}" was registered.`,
        ),
      );
    }
    return;
  }

  const normalized = normalizeDefinition(validatedDefinition);
  registeredDefinitions.set(validatedDefinition.id, normalized);

  const existingValue =
    settingsStateStore.getState().values[validatedDefinition.id];
  if (existingValue === undefined) {
    updateRawValue(validatedDefinition.id, normalized.defaultValue);
  }
}

function buildRemoteZod(
  control: SettingControlDto,
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
    default:
      return z.unknown();
  }
}

const buildRemoteOnSet = (
  id: string,
): ((next: unknown, prev: unknown) => void) => {
  if (id === SHARED_LOG_LEVEL_SETTING_ID) {
    return (next) => {
      setWebLogLevel(next);
    };
  }

  return () => {};
};

function registerRemoteDefinition(definition: SettingDefinitionDto): void {
  if (!isSettingId(definition.id)) {
    logger.warn({ id: definition.id }, "Skip remote setting with invalid id");
    return;
  }

  const remoteOptions = (definition.options ?? []).map((option) => ({
    value: option.value,
    labelKey: option.labelKey,
  }));

  let mapped: SettingDefinition;
  switch (definition.control.kind) {
    case "select":
      mapped = {
        id: definition.id,
        labelKey: definition.labelKey,
        scope: definition.scope,
        control: { kind: "select" },
        zod: buildRemoteZod(definition.control, remoteOptions),
        defaultValue: definition.defaultValue,
        options: remoteOptions,
        order: definition.order ?? undefined,
        visible: definition.visible ?? undefined,
        onSet: buildRemoteOnSet(definition.id),
      };
      break;
    case "toggle":
      mapped = {
        id: definition.id,
        labelKey: definition.labelKey,
        scope: definition.scope,
        control: { kind: "toggle" },
        zod: buildRemoteZod(definition.control, remoteOptions),
        defaultValue: definition.defaultValue,
        order: definition.order ?? undefined,
        visible: definition.visible ?? undefined,
        onSet: buildRemoteOnSet(definition.id),
      };
      break;
    case "text":
      mapped = {
        id: definition.id,
        labelKey: definition.labelKey,
        scope: definition.scope,
        control: {
          kind: "text",
          placeholderKey: definition.control.placeholder_key ?? undefined,
        },
        zod: buildRemoteZod(definition.control, remoteOptions),
        defaultValue: definition.defaultValue,
        order: definition.order ?? undefined,
        visible: definition.visible ?? undefined,
        onSet: buildRemoteOnSet(definition.id),
      };
      break;
    case "number":
      mapped = {
        id: definition.id,
        labelKey: definition.labelKey,
        scope: definition.scope,
        control: {
          kind: "number",
          placeholderKey: definition.control.placeholder_key ?? undefined,
          min: definition.control.min ?? undefined,
          max: definition.control.max ?? undefined,
          step: definition.control.step ?? undefined,
        },
        zod: buildRemoteZod(definition.control, remoteOptions),
        defaultValue: definition.defaultValue,
        order: definition.order ?? undefined,
        visible: definition.visible ?? undefined,
        onSet: buildRemoteOnSet(definition.id),
      };
      break;
    default:
      return;
  }

  registerDefinition(mapped);
}

function mergeRemoteDefinitions(definitions: SettingDefinitionDto[]): void {
  for (const definition of definitions) {
    registerRemoteDefinition(definition);
  }
}

function hydrateFromSnapshot(
  snapshot: SettingsSnapshotDto,
  options?: HydrateOptions,
): void {
  const effective: Required<HydrateOptions> = {
    notify: options?.notify ?? false,
    runOnSet: options?.runOnSet ?? false,
  };

  for (const [rawId, rawValue] of Object.entries(snapshot.values)) {
    if (!isSettingId(rawId)) {
      updateRawValue(rawId, rawValue);
      continue;
    }

    const definition = registeredDefinitions.get(rawId);
    if (!definition) {
      updateRawValue(rawId, rawValue);
      continue;
    }

    const parsed = definition.zod.safeParse(rawValue);
    if (!parsed.success) {
      logger.warn(
        { id: rawId },
        "Skip snapshot value because it does not match setting schema",
      );
      continue;
    }

    applyParsedValue(rawId, definition, parsed.data, effective);
  }

  updateVersion(snapshot.version);
}

function applyRemotePatch(
  changes: Record<string, unknown>,
  version: number,
): void {
  for (const [rawId, rawValue] of Object.entries(changes)) {
    if (!isSettingId(rawId)) {
      updateRawValue(rawId, rawValue);
      continue;
    }

    const definition = registeredDefinitions.get(rawId);
    if (!definition) {
      const updated = updateRawValue(rawId, rawValue);
      if (updated) {
        notifySubscribers(rawId);
      }
      continue;
    }

    const parsed = definition.zod.safeParse(rawValue);
    if (!parsed.success) {
      logger.warn(
        { id: rawId },
        "Skip remote patch value because it does not match setting schema",
      );
      continue;
    }

    applyParsedValue(rawId, definition, parsed.data, {
      notify: true,
      runOnSet: true,
    });
  }

  updateVersion(version);
}

export function settings(
  value: SettingClassCtor,
  _context: ClassDecoratorContext,
): void {
  settingsClasses.add(value);
  registerClass(value);
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

function registerClass(ctor: SettingClassCtor): void {
  if (!settingsClasses.has(ctor)) {
    reportRegistrationError(
      AppError.SettingsRegistration(
        `Class "${settingClassName(ctor)}" must use @settings before registerClass.`,
      ),
    );
    return;
  }

  if (registeredClasses.has(ctor)) {
    return;
  }

  void new ctor();
  const definitions = classFieldDefinitions.get(ctor) ?? [];

  for (const definition of definitions) {
    registerDefinition(definition);
  }

  registeredClasses.add(ctor);
}

function listDefinitions(): RegisteredSetting[] {
  return [...registeredDefinitions.values()].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.declarationOrder - b.declarationOrder;
  });
}

function get<T = unknown>(id: SettingId): T {
  const stateValue = settingsStateStore.getState().values[id];
  if (stateValue !== undefined) {
    return stateValue as T;
  }

  const definition = registeredDefinitions.get(id);
  if (definition) {
    return definition.defaultValue as T;
  }

  return undefined as T;
}

function set<T = unknown>(id: SettingId, value: T): boolean {
  const definition = registeredDefinitions.get(id);
  if (!definition) {
    return false;
  }

  const parsed = definition.zod.safeParse(value);
  if (!parsed.success) {
    return false;
  }

  const updated = applyParsedValue(id, definition, parsed.data, {
    notify: true,
    runOnSet: true,
  });
  if (updated) {
    remotePatchSender?.({ [id]: parsed.data });
  }
  return true;
}

function getVersion(): number {
  return settingsStateStore.getState().version;
}

function setVersion(version: number): void {
  updateVersion(version);
}

function subscribe(id: SettingId, callback: () => void): () => void {
  const subscribers = getFieldSubscribers(id);
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      fieldSubscribers.delete(id);
    }
  };
}

export const settingsApi: SettingsShardApi = {
  registerSetting(definition) {
    registerDefinition(definition);
  },
  registerClass(ctor) {
    registerClass(ctor);
  },
  mergeRemoteDefinitions(definitions) {
    mergeRemoteDefinitions(definitions);
  },
  hydrateFromSnapshot(snapshot, options) {
    hydrateFromSnapshot(snapshot, options);
  },
  applyRemotePatch(changes, version) {
    applyRemotePatch(changes, version);
  },
  configureRemotePatchSender(sender) {
    remotePatchSender = sender;
  },
  getVersion() {
    return getVersion();
  },
  setVersion(version) {
    setVersion(version);
  },
  get(id) {
    return get(id);
  },
  set(id, value) {
    return set(id, value);
  },
  subscribe(id, callback) {
    return subscribe(id, callback);
  },
  listDefinitions() {
    return listDefinitions();
  },
};
