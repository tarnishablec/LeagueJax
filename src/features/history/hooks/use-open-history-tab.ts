import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { type HistoryTabIdentity, useTabStore } from "@/stores/tabs";

const HISTORY_ROUTE_PATH = "/main/history";

function isHistoryRoute(pathname: string): boolean {
  return (
    pathname === HISTORY_ROUTE_PATH ||
    pathname.startsWith(`${HISTORY_ROUTE_PATH}/`)
  );
}

export function useOpenHistoryTab() {
  const location = useLocation();
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);

  return useCallback(
    (
      puuid: string,
      sgpServerId?: string | null,
      identity?: HistoryTabIdentity,
    ) => {
      if (!isHistoryRoute(location.pathname)) {
        void navigate(HISTORY_ROUTE_PATH);
      }

      openTab(puuid, sgpServerId, identity);
    },
    [location.pathname, navigate, openTab],
  );
}
