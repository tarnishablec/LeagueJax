import { type ZodType, z } from "zod";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type {
  RegisteredSetting,
  SettingClassCtor,
  SettingDefinition,
  SettingId,
  SettingsShardApi,
} from "@/features/settings/types";
import { AppError, type AppThatError } from "@/infra/errors";
import { createLogger } from "@/infra/logger";

interface SettingsState {
  values: Record<string, unknown>;
}

type DecoratedFieldDefinition = SettingDefinition;

const settingsStateStore = createStore<SettingsState>()(
  persist(
    () => ({
      values: {},
    }),
    {
      name: "league-jax-settings-v2",
    },
  ),
);

const settingsClasses = new WeakSet<SettingClassCtor>();
const classFieldDefinitions = new WeakMap<
  SettingClassCtor,
  DecoratedFieldDefinition[]
>();
const registeredClasses = new WeakSet<SettingClassCtor>();
const registeredDefinitions = new Map<SettingId, RegisteredSetting>();
const fieldSubscribers = new Map<SettingId, Set<() => void>>();

let declarationSequence = 0;
const logger = createLogger("settings-store");

const settingIdRegex = /^[^.]+\.[^.]+\.[^.]+$/;
const settingOptionSchema = z
  .object({
    value: z.string().min(1),
    labelKey: z.string().min(1),
  })
  .strict();

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

function updateValue(id: SettingId, value: unknown): void {
  settingsStateStore.setState((state) => ({
    values: {
      ...state.values,
      [id]: value,
    },
  }));
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

  if (registeredDefinitions.has(validatedDefinition.id)) {
    reportRegistrationError(
      AppError.SettingsRegistration(
        `Duplicate setting id "${validatedDefinition.id}" was registered.`,
      ),
    );
    return;
  }

  const normalized = normalizeDefinition(validatedDefinition);
  registeredDefinitions.set(validatedDefinition.id, normalized);

  const existingValue =
    settingsStateStore.getState().values[validatedDefinition.id];
  if (existingValue === undefined) {
    updateValue(validatedDefinition.id, normalized.defaultValue);
  }
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

  const previous = get(id);
  updateValue(id, parsed.data);
  definition.onSet(parsed.data, previous);
  notifySubscribers(id);
  return true;
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
