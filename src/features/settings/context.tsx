import { createContext, type ReactNode, useContext } from "react";
import type { SettingsReader } from "./types";

const SettingsContext = createContext<SettingsReader | null>(null);

export function useSettings(): SettingsReader {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}

export function SettingsProvider({
  value,
  children,
}: {
  value: SettingsReader;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
