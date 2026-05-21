import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { onCleanup, onMount } from "solid-js";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { createLogger } from "@/infra/logger";
import { useSolidLcuStore } from "@/stores/lcu.solid";

const logger = createLogger("solid-lcu-events");

export function useSolidLcuEvents(): void {
  const setInstances = useSolidLcuStore((state) => state.setInstances);

  onMount(() => {
    let disposed = false;
    let unlisten: UnlistenFn | null = null;

    const hydrateInstances = async () => {
      try {
        const instances = await invoke<LcuInstanceInfo[]>("lcu_get_instances");
        if (!disposed) {
          setInstances(instances);
        }
      } catch (error) {
        if (!disposed) {
          logger.error({ error }, "Failed to hydrate LCU instances");
        }
      }
    };

    const setup = async () => {
      try {
        await hydrateInstances();
        if (disposed) {
          return;
        }

        const dispose = await listen<LcuInstanceInfo[]>(
          "lcu-instances-changed",
          (event) => {
            if (disposed) {
              return;
            }

            setInstances(event.payload);
          },
        );

        if (disposed) {
          dispose();
          return;
        }

        unlisten = dispose;
      } catch (error) {
        if (disposed) {
          return;
        }

        logger.error({ error }, "Failed to subscribe LCU instance events");
      }
    };

    void setup();

    onCleanup(() => {
      disposed = true;
      unlisten?.();
    });
  });
}
