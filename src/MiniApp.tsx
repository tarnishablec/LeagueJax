import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { SWRConfig } from "swr";
import { MiniRoute } from "@/features/mini/routes/MiniRoute";
import { MiniWindowShell } from "@/layout/__mini-shell";

function useNotifyMiniReady() {
  useEffect(() => {
    void invoke("mini_window_ready");
  }, []);
}

export default function MiniApp() {
  useNotifyMiniReady();

  return (
    <SWRConfig value={{ revalidateOnFocus: false }}>
      <MiniWindowShell>
        <MiniRoute />
      </MiniWindowShell>
    </SWRConfig>
  );
}
