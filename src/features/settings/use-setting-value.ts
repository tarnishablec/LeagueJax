import type { Accessor } from "solid-js";
import { createSignal, onCleanup } from "solid-js";
import { useSolidSettings } from "./solid-context.solid";
import type { SettingId } from "./types";

export function useSolidSettingValue<T>(
  id: SettingId,
  fallback?: T,
): Accessor<T | undefined> {
  const settings = useSolidSettings();
  const [value, setValue] = createSignal<T | undefined>(
    settings.get<T>(id) ?? fallback,
    { equals: false },
  );
  const unsubscribe = settings.subscribe(id, () => {
    setValue(() => settings.get<T>(id) ?? fallback);
  });

  onCleanup(unsubscribe);

  return value;
}
