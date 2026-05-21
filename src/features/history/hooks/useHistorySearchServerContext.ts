import type { Accessor, Setter } from "solid-js";
import { createEffect, createMemo, createSignal } from "solid-js";
import type { SgpServersConfig } from "@/bindings/sgp";
import type { LeagueClientRegion } from "../utils/league-client-region";
import { useSolidLeagueClientRegion } from "./useLeagueClientRegion";
import { useSolidServerBootstrap } from "./useServerBootstrap";

type UseHistorySearchServerContextResult = {
  selectedServerId: Accessor<string>;
  setSelectedServerId: Setter<string>;
  isBootstrapping: Accessor<boolean>;
  bootstrapError: Accessor<string | null>;
  showServerSelect: Accessor<boolean>;
  serverSelectDisabled: Accessor<boolean>;
  region: Accessor<LeagueClientRegion>;
};

export function useSolidHistorySearchServerContext(params: {
  open: Accessor<boolean>;
  config: Accessor<SgpServersConfig>;
  enabled: Accessor<boolean>;
}): UseHistorySearchServerContextResult {
  const bootstrap = useSolidServerBootstrap({
    enabled: () => params.open() && params.enabled(),
  });
  const [selectedServerId, setSelectedServerId] = createSignal("");

  const region = useSolidLeagueClientRegion({
    focusedServerId: bootstrap.focusedServerId,
    selectedServerId,
    config: params.config,
  });

  const showServerSelect = createMemo(
    () => region().availableServerCodes.length >= 1,
  );
  const serverSelectDisabled = createMemo(
    () => region().availableServerCodes.length <= 1,
  );

  createEffect(() => {
    const focusedServerCode = region().focusedServerCode;
    const availableServerCodes = region().availableServerCodes;
    if (!focusedServerCode) {
      setSelectedServerId("");
      return;
    }

    setSelectedServerId((current) => {
      const currentUpper = current.toUpperCase();
      if (availableServerCodes.includes(currentUpper)) {
        return currentUpper;
      }
      return focusedServerCode;
    });
  });

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
