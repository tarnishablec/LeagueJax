import type { Accessor } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";

export function usePrefersReducedMotion(): Accessor<boolean> {
  const [reduceMotion, setReduceMotion] = createSignal(false);

  onMount(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    onCleanup(() => media.removeEventListener("change", sync));
  });

  return reduceMotion;
}
