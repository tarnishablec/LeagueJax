import type { Accessor } from "solid-js";
import { createMemo } from "solid-js";
import type { SgpServersConfig } from "@/bindings/sgp";
import {
  type LeagueClientRegion,
  resolveLeagueClientRegion,
} from "../utils/league-client-region";

export function useSolidLeagueClientRegion({
  focusedServerId,
  selectedServerId,
  config,
}: {
  focusedServerId: Accessor<string | null>;
  selectedServerId: Accessor<string>;
  config: Accessor<SgpServersConfig>;
}): Accessor<LeagueClientRegion> {
  return createMemo(() =>
    resolveLeagueClientRegion({
      focusedServerId: focusedServerId(),
      selectedServerId: selectedServerId(),
      config: config(),
    }),
  );
}
