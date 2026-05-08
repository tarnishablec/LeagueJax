import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useLocation, useOutlet } from "react-router";
import { ScrollArea } from "@/components/scroll-area";
import { useSettings } from "@/features/settings/context";
import * as s from "./SettingsHub.css";
import {
  buildSettingsPages,
  resolveSettingsTransitionKey,
} from "./SettingsHub.utils";
import { SettingsPageTabs } from "./SettingsPageTabs";
import type { PageEntry } from "./settings-view-model";

export interface SettingsOutletContext {
  pages: PageEntry[];
}

function SettingsRouteOutlet({
  outletContext,
  pathname,
}: {
  outletContext: SettingsOutletContext;
  pathname: string;
}) {
  const outlet = useOutlet(outletContext);
  const reduceMotion = useReducedMotion();
  const hasMountedRef = useRef(false);
  const routeKey = resolveSettingsTransitionKey(pathname);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  return outlet ? (
    <motion.div
      key={routeKey}
      className={s.outletRouteLayer}
      initial={
        reduceMotion || !hasMountedRef.current ? false : { opacity: 0.72, y: 3 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      {outlet}
    </motion.div>
  ) : null;
}

export function SettingsHub() {
  const settings = useSettings();
  const { pathname } = useLocation();
  const definitionsVersion = useSyncExternalStore(
    (onStoreChange) => settings.subscribeDefinitions(onStoreChange),
    () => settings.getDefinitionsVersion(),
    () => settings.getDefinitionsVersion(),
  );
  const pages = useMemo(() => {
    void definitionsVersion;
    return buildSettingsPages(
      settings.listDefinitions(),
      settings.listPages(),
      settings.listSections(),
    );
  }, [settings, definitionsVersion]);
  const outletContext: SettingsOutletContext = { pages };

  return (
    <div className={s.page}>
      <SettingsPageTabs pages={pages} />
      <ScrollArea
        className={s.outlet}
        contentClassName={s.outletContent}
        direction="vertical"
        mode="outset"
        outsetWidth="12px"
      >
        <SettingsRouteOutlet
          outletContext={outletContext}
          pathname={pathname}
        />
      </ScrollArea>
    </div>
  );
}
