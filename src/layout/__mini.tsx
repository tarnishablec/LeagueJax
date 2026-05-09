import { Outlet } from "react-router";
import { MiniWindowShell } from "./__mini-shell";

export function MiniWindowLayout() {
  return (
    <MiniWindowShell>
      <Outlet />
    </MiniWindowShell>
  );
}
