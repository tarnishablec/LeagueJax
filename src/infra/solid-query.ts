import type { Accessor, ResourceReturn } from "solid-js";
import { createMemo, createResource, createSignal, untrack } from "solid-js";

export type SolidQueryKey =
  | string
  | number
  | boolean
  | readonly unknown[]
  | Record<string, unknown>
  | null
  | undefined
  | false;

export interface SolidQueryOptions<TData> {
  initialValue?: TData;
  keepPreviousData?: boolean;
  cache?: SolidQueryCache<TData>;
}

export interface SolidQueryResult<TData> {
  data: Accessor<TData | undefined>;
  error: Accessor<unknown>;
  isLoading: Accessor<boolean>;
  isValidating: Accessor<boolean>;
  mutate: (next?: TData | Promise<TData>) => Promise<TData | undefined>;
  refetch: () => Promise<TData | undefined>;
}

export class SolidQueryCache<TData = unknown> {
  private readonly entries = new Map<string, TData>();

  public get(key: string): TData | undefined {
    return this.entries.get(key);
  }

  public set(key: string, value: TData): void {
    this.entries.set(key, value);
  }

  public delete(key: string): void {
    this.entries.delete(key);
  }

  public clear(): void {
    this.entries.clear();
  }
}

export const defaultSolidQueryCache = new SolidQueryCache();

function serializeSolidQueryKey(key: Exclude<SolidQueryKey, null | undefined>) {
  return typeof key === "string" ? key : JSON.stringify(key);
}

function resolveActiveKey(key: SolidQueryKey): string | null {
  if (key === null || key === undefined || key === false) {
    return null;
  }

  return serializeSolidQueryKey(key);
}

function readResource<TData>(
  resource: ResourceReturn<TData | undefined>[0],
  previous: Accessor<TData | undefined>,
  keepPreviousData: boolean,
): TData | undefined {
  const value = resource();
  if (value !== undefined) {
    return value;
  }

  return keepPreviousData ? previous() : undefined;
}

// This intentionally mirrors only the project-level request cache behaviors we use:
// disabled keys, a bounded cache hook point, mutate, and explicit refetch.
export function createSolidQuery<TData>(
  key: Accessor<SolidQueryKey>,
  fetcher: (
    key: Exclude<SolidQueryKey, null | undefined | false>,
  ) => Promise<TData>,
  options: SolidQueryOptions<TData> = {},
): SolidQueryResult<TData> {
  const cache = options.cache ?? defaultSolidQueryCache;
  const [previousData, setPreviousData] = createSignal<TData | undefined>(
    options.initialValue,
    { equals: false },
  );
  const activeKey = createMemo(() => resolveActiveKey(key()));

  const [resource, controls] = createResource<TData | undefined, string>(
    activeKey,
    async (cacheKey, info) => {
      if (!info.refetching) {
        const cached = cache.get(cacheKey) as TData | undefined;
        if (cached !== undefined) {
          setPreviousData(() => cached);
          return cached;
        }
      }

      const requestKey = untrack(key) as Exclude<
        SolidQueryKey,
        null | undefined | false
      >;
      const value = await fetcher(requestKey);
      cache.set(cacheKey, value);
      setPreviousData(() => value);
      return value;
    },
  );

  const mutate: SolidQueryResult<TData>["mutate"] = async (next) => {
    const cacheKey = activeKey();
    if (cacheKey === null) {
      return undefined;
    }

    if (next !== undefined) {
      const value = (await next) as TData;
      cache.set(cacheKey, value);
      setPreviousData(() => value);
      controls.mutate(() => value);
      return value;
    }

    const value = await controls.refetch();
    if (value === null || value === undefined) {
      return undefined;
    }

    const nextValue = value as TData;
    cache.set(cacheKey, nextValue);
    setPreviousData(() => nextValue);
    return nextValue;
  };

  return {
    data: () =>
      readResource(resource, previousData, options.keepPreviousData ?? false),
    error: () => resource.error,
    isLoading: () =>
      resource.loading &&
      readResource(
        resource,
        previousData,
        options.keepPreviousData ?? false,
      ) === undefined,
    isValidating: () => resource.loading,
    mutate,
    refetch: () => mutate(),
  };
}
