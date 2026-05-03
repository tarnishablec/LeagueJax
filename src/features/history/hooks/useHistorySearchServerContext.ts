import { useEffect, useMemo, useState } from "react";
import type { SgpServersConfig } from "@/bindings/sgp";
import { useLeagueClientRegion } from "./useLeagueClientRegion";
import { useServerBootstrap } from "./useServerBootstrap";

type UseHistorySearchServerContextParams = {
  open: boolean;
  config: SgpServersConfig;
  enabled: boolean;
};

type UseHistorySearchServerContextResult = {
  selectedServerId: string;
  setSelectedServerId: (serverId: string) => void;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  showServerSelect: boolean;
  serverSelectDisabled: boolean;
  region: ReturnType<typeof useLeagueClientRegion>;
};

export function useHistorySearchServerContext({
  open,
  config,
  enabled,
}: UseHistorySearchServerContextParams): UseHistorySearchServerContextResult {
  const bootstrap = useServerBootstrap({ enabled: open && enabled });
  const [selectedServerId, setSelectedServerId] = useState("");

  const region = useLeagueClientRegion({
    focusedServerId: bootstrap.focusedServerId,
    selectedServerId,
    config,
  });

  const showServerSelect = useMemo(
    () => region.availableServerCodes.length >= 1,
    [region.availableServerCodes.length],
  );

  const serverSelectDisabled = useMemo(
    () => region.availableServerCodes.length <= 1,
    [region.availableServerCodes.length],
  );

  useEffect(() => {
    if (!region.focusedServerCode) {
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
  }, [region.focusedServerCode, region.availableServerCodes]);

  return {
    selectedServerId,
    setSelectedServerId,
    isBootstrapping: bootstrap.isBootstrapping,
    bootstrapError: bootstrap.bootstrapError,
    showServerSelect,
    serverSelectDisabled,
    region,
  };
}
