/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { onCleanup, onMount, } from "solid-js";
import * as s from "@/features/debug/routes/DebugCommandPanel.css.ts";
import { useSolidSettings } from "@/features/settings/solid-context";


export function DebugCommandRoute(): JSX.Element {
  const settings = useSolidSettings();

  onMount(() => {
    const unsubscribe = settings.subscribeDefinitions(() => {
    });
    onCleanup(unsubscribe);
  });


  return (
    <div class={s.debugPage}>

    </div>
  );
}

export default DebugCommandRoute;
