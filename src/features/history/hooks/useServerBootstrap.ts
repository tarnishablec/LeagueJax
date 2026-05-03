import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

type UseServerBootstrapParams = {
  enabled: boolean;
};

type UseServerBootstrapResult = {
  focusedServerId: string | null;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  reset: () => void;
  refresh: () => void;
};

export function useServerBootstrap({
  enabled,
}: UseServerBootstrapParams): UseServerBootstrapResult {
  const [focusedServerId, setFocusedServerId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(() => {
    const currentRequestId = ++requestIdRef.current;
    setIsBootstrapping(true);
    setBootstrapError(null);
    void invoke<string>("get_current_sgp_server_id")
      .then((serverId) => {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }
        setFocusedServerId(serverId.trim().toUpperCase());
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error("Server context bootstrap failed:", error);
        setBootstrapError(message);
      })
      .finally(() => {
        if (requestIdRef.current === currentRequestId) {
          setIsBootstrapping(false);
        }
      });
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setFocusedServerId(null);
    setIsBootstrapping(false);
    setBootstrapError(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    refresh();
  }, [enabled, refresh]);

  return { focusedServerId, isBootstrapping, bootstrapError, reset, refresh };
}
