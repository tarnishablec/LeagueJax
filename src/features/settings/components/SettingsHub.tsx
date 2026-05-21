/** @jsxImportSource solid-js */
import { useLocation } from "@solidjs/router";
import type { JSX } from "solid-js";
import {
  children,
  createContext,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from "solid-js";
import { Motion } from "solid-motionone";
import { ScrollArea } from "@/components/scroll-area/ScrollArea";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import * as s from "./SettingsHub.css.ts";
import {
  buildSettingsPages,
  resolveSettingsTransitionKey,
} from "./SettingsHub.utils";
import { SettingsPageTabs } from "./SettingsPageTabs";
import type { PageEntry } from "./settings-view-model";

export interface SettingsOutletContext {
  pages: PageEntry[];
}

const SettingsPagesContext = createContext<() => PageEntry[]>();

export function useSolidSettingsPages(): () => PageEntry[] {
  const ctx = useContext(SettingsPagesContext);
  if (!ctx) {
    throw new Error("useSolidSettingsPages must be used within SettingsHub");
  }
  return ctx;
}

function usePrefersReducedMotion() {
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

function SettingsRouteOutlet(props: {
  children?: JSX.Element;
  pathname: string;
}): JSX.Element {
  const routeContent = children(() => props.children);
  const reduceMotion = usePrefersReducedMotion();
  const [hasMounted, setHasMounted] = createSignal(false);
  const routeKey = createMemo(() =>
    resolveSettingsTransitionKey(props.pathname),
  );

  onMount(() => {
    setHasMounted(true);
  });

  return (
    <Motion.div
      class={s.outletRouteLayer}
      initial={reduceMotion() || !hasMounted() ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.75, easing: "ease-in" }}
      data-route-key={routeKey()}
    >
      {routeContent()}
    </Motion.div>
  );
}

export function SettingsHub(props: { children?: JSX.Element }): JSX.Element {
  const settings = useSolidSettings();
  const location = useLocation();
  const [definitionsVersion, setDefinitionsVersion] = createSignal(
    settings.getDefinitionsVersion(),
  );

  onMount(() => {
    const unsubscribe = settings.subscribeDefinitions(() => {
      setDefinitionsVersion(settings.getDefinitionsVersion());
    });
    onCleanup(unsubscribe);
  });

  const pages = createMemo(() => {
    definitionsVersion();
    return buildSettingsPages(
      settings.listDefinitions(),
      settings.listPages(),
      settings.listSections(),
    );
  });

  return (
    <SettingsPagesContext.Provider value={pages}>
      <div class={s.page}>
        <SettingsPageTabs pages={pages()} />
        <ScrollArea
          className={s.outlet}
          contentClassName={s.outletContent}
          direction="vertical"
          mode="outset"
          outsetWidth="12px"
        >
          <SettingsRouteOutlet pathname={location.pathname}>
            {props.children}
          </SettingsRouteOutlet>
        </ScrollArea>
      </div>
    </SettingsPagesContext.Provider>
  );
}
