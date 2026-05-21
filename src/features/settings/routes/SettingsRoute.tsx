/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { SettingsHub } from "../components/SettingsHub";

export function SettingsRoute(props: { children?: JSX.Element }): JSX.Element {
  return <SettingsHub>{props.children}</SettingsHub>;
}

export default SettingsRoute;
