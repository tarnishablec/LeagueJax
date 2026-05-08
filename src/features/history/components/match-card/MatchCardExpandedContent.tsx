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
import {
  MatchParticipantPicker,
  MatchSelectedParticipantHeader,
} from "./MatchParticipantPicker";
import { MatchRunesTab } from "./MatchRunesTab";
import { useMatchParticipantSelection } from "./match-participant-selection";

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
  const participants = summary.json.participants;
  const { selectedEntry, selectedKey, setSelectedKey } =
    useMatchParticipantSelection(participants);
  const runesActive = activeTab.includes(RUNES_TAB_ID);
  const buildActive = activeTab.includes(BUILD_TAB_ID);
  const participantTabActive = runesActive || buildActive;

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
        {participantTabActive ? (
          selectedEntry ? (
            <div className={s.participantTabRoot}>
              <MatchParticipantPicker
                summary={summary}
                participants={participants}
                selectedKey={selectedKey}
                onSelectedKeyChange={setSelectedKey}
                ariaLabel={
                  runesActive
                    ? "Match participant rune tabs"
                    : "Match participant build tabs"
                }
                actionLabel={(displayName) =>
                  runesActive
                    ? `Show runes for ${displayName}`
                    : `Show build for ${displayName}`
                }
              />
              <div className={s.participantTabContent}>
                <MatchSelectedParticipantHeader
                  participant={selectedEntry.participant}
                />
                {runesActive ? (
                  <MatchRunesTab
                    summary={summary}
                    participant={selectedEntry.participant}
                  />
                ) : null}
                {buildActive ? (
                  <MatchBuildTab
                    detail={detail}
                    detailLoading={detailLoading}
                    participant={selectedEntry.participant}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <span className={s.participantEmptyState}>
              {t("history.matchDetails.noParticipantData", {
                defaultValue: "No participant data",
              })}
            </span>
          )
        ) : null}
      </div>
    </div>
  );
}
