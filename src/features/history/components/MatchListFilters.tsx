/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { createMemo } from "solid-js";
import {
  createListCollection,
  SettingsSelect,
} from "@/components/settings-ui/index";
import { useSolidTranslation } from "@/i18n/solid";
import type { MatchModeTag } from "../types/match-mode";

export function MatchListFilters(props: {
  modeTag: MatchModeTag;
  pageSize: number;
  disabled?: boolean;
  modeSelectOptions: Array<{ value: string; label: string }>;
  pageSizeSelectOptions: Array<{ value: string; label: string }>;
  onModeChange: (value: MatchModeTag) => void;
  onPageSizeChange: (value: number) => void;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const modeCollection = createMemo(() =>
    createListCollection({ items: props.modeSelectOptions }),
  );
  const pageSizeCollection = createMemo(() =>
    createListCollection({ items: props.pageSizeSelectOptions }),
  );
  const formatPageSize = (label: string) =>
    String(t("history.itemsPerPage", { count: label }));

  return (
    <>
      <SettingsSelect
        collection={modeCollection()}
        value={[props.modeTag]}
        disabled={props.disabled}
        onValueChange={(details) => {
          const next = details.value[0];
          if (next) {
            props.onModeChange(next as MatchModeTag);
          }
        }}
      />

      <div></div>

      <SettingsSelect
        collection={pageSizeCollection()}
        value={[String(props.pageSize)]}
        disabled={props.disabled}
        onValueChange={(details) => {
          const next = details.value[0];
          if (next) {
            props.onPageSizeChange(Number(next));
          }
        }}
        formatValue={formatPageSize}
      />
    </>
  );
}
