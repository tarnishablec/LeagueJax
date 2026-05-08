import { ToggleGroup } from "@ark-ui/react/toggle-group";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  RawMatchDetailsGame,
  RawMatchSummaryGame,
} from "@/bindings/matches.ts";
import {
  MatchReplayControl,
  replayMatchContextFromSummary,
} from "@/features/replay/public";
import { MatchBuildTab } from "./MatchBuildTab";
import * as s from "./MatchCardExpandedContent.css";
import { MatchDetailsTab } from "./MatchDetailsTab";
import { MatchRunesTab } from "./MatchRunesTab";

const DETAILS_TAB_ID = "details";
const RUNES_TAB_ID = "runes";
const BUILD_TAB_ID = "build";

export function MatchCardExpandedContent({
  summary,
  detail,
  detailLoading,
  sgpServerId,
}: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
  detailLoading: boolean;
  sgpServerId: string | null;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string[]>([DETAILS_TAB_ID]);
  const replayContext = useMemo(
    () => replayMatchContextFromSummary(summary, sgpServerId),
    [summary, sgpServerId],
  );

  return (
    <div className={s.expandedRoot}>
      <div className={s.header}>
        <ToggleGroup.Root
          className={s.tabList}
          value={activeTab}
          deselectable={false}
          onValueChange={({ value }) => {
            if (value.length > 0) {
              setActiveTab(value);
            }
          }}
          aria-label="Match detail tabs"
        >
          <ToggleGroup.Item value={DETAILS_TAB_ID} className={s.tabTrigger}>
            {t("history.matchDetails.tabs.details", {
              defaultValue: "Details",
            })}
          </ToggleGroup.Item>
          <ToggleGroup.Item value={RUNES_TAB_ID} className={s.tabTrigger}>
            {t("history.matchDetails.tabs.runes", {
              defaultValue: "Runes",
            })}
          </ToggleGroup.Item>
          <ToggleGroup.Item value={BUILD_TAB_ID} className={s.tabTrigger}>
            {t("history.matchDetails.tabs.build", {
              defaultValue: "Build",
            })}
          </ToggleGroup.Item>
        </ToggleGroup.Root>

        <MatchReplayControl context={replayContext} />
      </div>

      <div className={s.tabPanel}>
        {activeTab.includes(DETAILS_TAB_ID) ? (
          <MatchDetailsTab
            summary={summary}
            detail={detail}
            sgpServerId={sgpServerId}
          />
        ) : null}
        {activeTab.includes(RUNES_TAB_ID) ? (
          <MatchRunesTab summary={summary} detail={detail} />
        ) : null}
        {activeTab.includes(BUILD_TAB_ID) ? (
          <MatchBuildTab
            summary={summary}
            detail={detail}
            detailLoading={detailLoading}
          />
        ) : null}
      </div>
    </div>
  );
}
