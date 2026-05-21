/** @jsxImportSource solid-js */
import { invoke } from "@tauri-apps/api/core";
import { onMount } from "solid-js";
import { MiniRoute } from "@/features/mini/routes/MiniRoute";
import { MiniWindowShell } from "@/layout/__mini-shell";

function useNotifyMiniReady() {
  onMount(() => {
    void invoke("mini_window_ready");
  });
}

export default function MiniApp() {
  useNotifyMiniReady();

  return (
    <MiniWindowShell>
      <MiniRoute />
    </MiniWindowShell>
  );
}
