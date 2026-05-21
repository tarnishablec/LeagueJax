import { useLocation, useNavigate } from "@solidjs/router";
import type { HistoryTabIdentity } from "@/stores/tabs";
import { useSolidTabStore } from "@/stores/tabs";

const HISTORY_ROUTE_PATH = "/main/history";

function isHistoryRoute(pathname: string): boolean {
  return (
    pathname === HISTORY_ROUTE_PATH ||
    pathname.startsWith(`${HISTORY_ROUTE_PATH}/`)
  );
}

export function useSolidOpenHistoryTab() {
  const location = useLocation();
  const navigate = useNavigate();
  const openTab = useSolidTabStore((state) => state.openTab);

  return (
    puuid: string,
    sgpServerId?: string | null,
    identity?: HistoryTabIdentity,
  ) => {
    if (!isHistoryRoute(location.pathname)) {
      void navigate(HISTORY_ROUTE_PATH);
    }

    openTab(puuid, sgpServerId, identity);
  };
}
