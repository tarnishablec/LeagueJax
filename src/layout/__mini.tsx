import { Outlet } from "react-router";
import { MiniTitleBar } from "@/features/mini/components/MiniTitleBar.tsx";
import { useTheme } from "@/hooks/use-theme";
import { useWindowEffectBackgroundFallback } from "@/hooks/use-window-effect";
import * as mini from "./mini-window.css";

export function MiniWindowLayout() {
  useWindowEffectBackgroundFallback();
  useTheme();

  return (
    <div className={mini.shell}>
      <MiniTitleBar />
      <main className={mini.content}>
        <Outlet />
      </main>
    </div>
  );
}
