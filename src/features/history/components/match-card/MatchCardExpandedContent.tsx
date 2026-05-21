/** @jsxImportSource solid-js */
import { ToggleGroup } from "@ark-ui/solid/toggle-group";
import type { JSX } from "solid-js";
import { createMemo, createSignal, Show } from "solid-js";
import type {
  RawMatchDetailsGame,
  RawMatchSummaryGame,
} from "@/bindings/matches.ts";
import {
  MatchReplayControl,
  replayMatchContextFromSummary,
} from "@/features/replay/public";
import { useSolidTranslation } from "@/i18n/solid";
import { MatchBuildTab } from "./MatchBuildTab";
import * as s from "./MatchCardExpandedContent.css";
import { MatchDetailsTab } from "./MatchDetailsTab";
import {
  MatchParticipantPicker,
  MatchSelectedParticipantHeader,
} from "./MatchParticipantPicker";
import { MatchRunesTab } from "./MatchRunesTab";
import { useSolidMatchParticipantSelection } from "./match-participant-selection";

const DETAILS_TAB_ID = "details";
const RUNES_TAB_ID = "runes";
const BUILD_TAB_ID = "build";

export function MatchCardExpandedContent(props: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
  detailLoading: boolean;
  sgpServerId: string | null;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const [activeTab, setActiveTab] = createSignal<string[]>([DETAILS_TAB_ID]);
  const replayContext = createMemo(() =>
    replayMatchContextFromSummary(props.summary, props.sgpServerId),
  );
  const participants = () => props.summary.json.participants;
  const { selectedEntry, selectedKey, setSelectedKey } =
    useSolidMatchParticipantSelection(participants);
  const runesActive = () => activeTab().includes(RUNES_TAB_ID);
  const buildActive = () => activeTab().includes(BUILD_TAB_ID);
  const participantTabActive = () => runesActive() || buildActive();

  return (
    <div class={s.expandedRoot}>
      <div class={s.header}>
        <ToggleGroup.Root
          class={s.tabList}
          value={activeTab()}
          deselectable={false}
          onValueChange={({ value }) => {
            if (value.length > 0) {
              setActiveTab(value);
            }
          }}
          aria-label="Match detail tabs"
        >
          <ToggleGroup.Item value={DETAILS_TAB_ID} class={s.tabTrigger}>
            {t("history.matchDetails.tabs.details", {
              defaultValue: "Details",
            })}
          </ToggleGroup.Item>
          <ToggleGroup.Item value={RUNES_TAB_ID} class={s.tabTrigger}>
            {t("history.matchDetails.tabs.runes", {
              defaultValue: "Runes",
            })}
          </ToggleGroup.Item>
          <ToggleGroup.Item value={BUILD_TAB_ID} class={s.tabTrigger}>
            {t("history.matchDetails.tabs.build", {
              defaultValue: "Build",
            })}
          </ToggleGroup.Item>
        </ToggleGroup.Root>

        <MatchReplayControl context={replayContext()} />
      </div>

      <div class={s.tabPanel}>
        <Show when={activeTab().includes(DETAILS_TAB_ID)}>
          <MatchDetailsTab
            summary={props.summary}
            detail={props.detail}
            sgpServerId={props.sgpServerId}
          />
        </Show>
        <Show when={participantTabActive()}>
          <Show
            when={selectedEntry()}
            fallback={
              <span class={s.participantEmptyState}>
                {t("history.matchDetails.noParticipantData", {
                  defaultValue: "No participant data",
                })}
              </span>
            }
          >
            {(entry) => (
              <div class={s.participantTabRoot}>
                <MatchParticipantPicker
                  summary={props.summary}
                  participants={participants()}
                  selectedKey={selectedKey()}
                  onSelectedKeyChange={setSelectedKey}
                  ariaLabel={
                    runesActive()
                      ? "Match participant rune tabs"
                      : "Match participant build tabs"
                  }
                  actionLabel={(displayName) =>
                    runesActive()
                      ? `Show runes for ${displayName}`
                      : `Show build for ${displayName}`
                  }
                />
                <div class={s.participantTabContent}>
                  <MatchSelectedParticipantHeader
                    participant={entry().participant}
                  />
                  <Show when={runesActive()}>
                    <MatchRunesTab
                      summary={props.summary}
                      participant={entry().participant}
                    />
                  </Show>
                  <Show when={buildActive()}>
                    <MatchBuildTab
                      detail={props.detail}
                      detailLoading={props.detailLoading}
                      participant={entry().participant}
                    />
                  </Show>
                </div>
              </div>
            )}
          </Show>
        </Show>
      </div>
    </div>
  );
}
