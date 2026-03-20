import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import type { SgpServersConfig } from "@/bindings/sgp";
import { useLeagueClientRegion } from "./useLeagueClientRegion";

type UseHistorySearchServerContextParams = {
  open: boolean;
  config: SgpServersConfig;
};

type UseHistorySearchServerContextResult = {
  selectedServerId: string;
  setSelectedServerId: (serverId: string) => void;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  showServerSelect: boolean;
  region: ReturnType<typeof useLeagueClientRegion>;
  resetServerContext: () => void;
};

export function useHistorySearchServerContext({
  open,
  config,
}: UseHistorySearchServerContextParams): UseHistorySearchServerContextResult {
  const [focusedServerId, setFocusedServerId] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const region = useLeagueClientRegion({
    focusedServerId,
    selectedServerId,
    config,
  });

  const showServerSelect = useMemo(
    () => region.availableServerCodes.length > 1,
    [region.availableServerCodes.length],
  );

  const resetServerContext = () => {
    setFocusedServerId(null);
    setSelectedServerId("");
    setBootstrapError(null);
  };

  useEffect(() => {
    if (!open || focusedServerId || isBootstrapping) {
      return;
    }

    let cancelled = false;
    setIsBootstrapping(true);
    void invoke<string>("get_current_sgp_server_id")
      .then((serverId) => {
        if (cancelled) {
          return;
        }
        setBootstrapError(null);
        setFocusedServerId(serverId.trim().toUpperCase());
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load server context.";
        setBootstrapError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, focusedServerId, isBootstrapping]);

  useEffect(() => {
    if (!region.focusedServerCode || !showServerSelect) {
      setSelectedServerId("");
      return;
    }

    setSelectedServerId((current) => {
      const currentUpper = current.toUpperCase();
      if (region.availableServerCodes.includes(currentUpper)) {
        return currentUpper;
      }
      return region.focusedServerCode ?? "";
    });
  }, [region.focusedServerCode, region.availableServerCodes, showServerSelect]);

  return {
    selectedServerId,
    setSelectedServerId,
    isBootstrapping,
    bootstrapError,
    showServerSelect,
    region,
    resetServerContext,
  };
}
