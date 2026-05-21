/** @jsxImportSource solid-js */

import type { JSX } from "solid-js";
import { createContext, useContext } from "solid-js";
import type { SettingsReader } from "./types";

const SolidSettingsContext = createContext<SettingsReader>();

export function useSolidSettings(): SettingsReader {
  const ctx = useContext(SolidSettingsContext);
  if (!ctx) {
    throw new Error(
      "useSolidSettings must be used within SolidSettingsProvider",
    );
  }
  return ctx;
}

export function SolidSettingsProvider(props: {
  value: SettingsReader;
  children: JSX.Element;
}) {
  return (
    <SolidSettingsContext.Provider value={props.value}>
      {props.children}
    </SolidSettingsContext.Provider>
  );
}
