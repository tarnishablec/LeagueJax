/** @jsxImportSource solid-js */
import { Navigate } from "@solidjs/router";
import type { JSX } from "solid-js";

export function ToolsIndexRoute(): JSX.Element {
  return <Navigate href="/main/tools/claim" />;
}

export default ToolsIndexRoute;
