/** @jsxImportSource solid-js */
import { SegmentGroup } from "@ark-ui/solid/segment-group";
import type { JSX } from "solid-js";
import { For } from "solid-js";
import { useSolidTranslation } from "@/i18n/solid";
import { ClaimToolPanel } from "../components/ClaimToolPanel";
import * as s from "./ToolsRoute.css.ts";

type ToolsPage = "claim";

const pages = [
  {
    value: "claim",
    labelKey: "tools.pages.claim",
  },
] as const;

export function ToolsRoute(): JSX.Element {
  const { t } = useSolidTranslation();
  const page: ToolsPage = "claim";

  return (
    <div class={s.page}>
      <SegmentGroup.Root class={s.segmentRoot} value={page}>
        <For each={pages}>
          {(item) => (
            <SegmentGroup.Item class={s.segmentItem} value={item.value}>
              <SegmentGroup.ItemText>{t(item.labelKey)}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          )}
        </For>
      </SegmentGroup.Root>

      <div class={s.content}>
        <ClaimToolPanel />
      </div>
    </div>
  );
}

export default ToolsRoute;
