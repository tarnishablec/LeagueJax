import { SegmentGroup } from "@ark-ui/react/segment-group";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/scroll-area";
import { ClaimToolPanel } from "../components/ClaimToolPanel";
import * as s from "./ToolsRoute.css";

type ToolsPage = "claim";

const pages = [
  {
    value: "claim",
    labelKey: "tools.pages.claim",
  },
] as const;

export function ToolsRoute() {
  const { t } = useTranslation();
  const page: ToolsPage = "claim";

  return (
    <div className={s.page}>
      <SegmentGroup.Root className={s.segmentRoot} value={page}>
        {pages.map((item) => (
          <SegmentGroup.Item
            className={s.segmentItem}
            key={item.value}
            value={item.value}
          >
            <SegmentGroup.ItemText>{t(item.labelKey)}</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        ))}
      </SegmentGroup.Root>

      <ScrollArea
        className={s.content}
        contentClassName={s.contentInner}
        direction="vertical"
        mode="outset"
        outsetWidth="12px"
      >
        <ClaimToolPanel />
      </ScrollArea>
    </div>
  );
}
