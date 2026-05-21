import { invoke } from "@tauri-apps/api/core";
import type { Accessor } from "solid-js";
import { createEffect, createSignal } from "solid-js";

type UseServerBootstrapResult = {
  focusedServerId: Accessor<string | null>;
  isBootstrapping: Accessor<boolean>;
  bootstrapError: Accessor<string | null>;
  reset: () => void;
  refresh: () => void;
};

export function useSolidServerBootstrap(params: {
  enabled: Accessor<boolean>;
}): UseServerBootstrapResult {
  const [focusedServerId, setFocusedServerId] = createSignal<string | null>(
    null,
  );
  const [isBootstrapping, setIsBootstrapping] = createSignal(false);
  const [bootstrapError, setBootstrapError] = createSignal<string | null>(null);
  let requestId = 0;

  const refresh = () => {
    const currentRequestId = ++requestId;
    setIsBootstrapping(true);
    setBootstrapError(null);
    void invoke<string>("get_current_sgp_server_id")
      .then((serverId) => {
        if (requestId !== currentRequestId) {
          return;
        }
        setFocusedServerId(serverId.trim().toUpperCase());
      })
      .catch((error: unknown) => {
        if (requestId !== currentRequestId) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error("Server context bootstrap failed:", error);
        setBootstrapError(message);
      })
      .finally(() => {
        if (requestId === currentRequestId) {
          setIsBootstrapping(false);
        }
      });
  };

  const reset = () => {
    requestId += 1;
    setFocusedServerId(null);
    setIsBootstrapping(false);
    setBootstrapError(null);
  };

  createEffect(() => {
    if (!params.enabled()) {
      reset();
      return;
    }

    refresh();
  });

  return {
    focusedServerId,
    isBootstrapping,
    bootstrapError,
    reset,
    refresh,
  };
}
