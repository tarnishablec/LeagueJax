/** @jsxImportSource solid-js */
import { SegmentGroup } from "@ark-ui/solid/segment-group";
import { useLocation, useNavigate } from "@solidjs/router";
import type { JSX } from "solid-js";
import { createMemo, For } from "solid-js";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./ToolsRoute.css.ts";

type ToolsPage = "claim" | "mcp";

const pages = [
  {
    value: "claim",
    labelKey: "tools.pages.claim",
    to: "/main/tools/claim",
  },
  {
    value: "mcp",
    labelKey: "tools.pages.mcp",
    to: "/main/tools/mcp",
  },
] as const;

function resolveActivePage(pathname: string): ToolsPage {
  return pathname.includes("/main/tools/mcp") ? "mcp" : "claim";
}

export function ToolsRoute(props: { children?: JSX.Element }): JSX.Element {
  const { t } = useSolidTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const page = createMemo(() => resolveActivePage(location.pathname));

  return (
    <div class={s.page}>
      <SegmentGroup.Root
        class={s.segmentRoot}
        value={page()}
        onValueChange={(details) => {
          const next = pages.find((item) => item.value === details.value);
          if (next) {
            navigate(next.to);
          }
        }}
      >
        <For each={pages}>
          {(item) => (
            <SegmentGroup.Item class={s.segmentItem} value={item.value}>
              <SegmentGroup.ItemText>{t(item.labelKey)}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          )}
        </For>
      </SegmentGroup.Root>

      <div class={s.content}>{props.children}</div>
    </div>
  );
}

export default ToolsRoute;
