import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createListCollection, SettingsSelect } from "@/components/settings-ui";
import type { MatchModeTag } from "../hooks/use-match-history";

export function MatchListFilters({
  modeTag,
  pageSize,
  modeSelectOptions,
  pageSizeSelectOptions,
  onModeChange,
  onPageSizeChange,
}: {
  modeTag: MatchModeTag;
  pageSize: number;
  modeSelectOptions: Array<{ value: string; label: string }>;
  pageSizeSelectOptions: Array<{ value: string; label: string }>;
  onModeChange: (value: MatchModeTag) => void;
  onPageSizeChange: (value: number) => void;
}) {
  const modeCollection = useMemo(
    () => createListCollection({ items: modeSelectOptions }),
    [modeSelectOptions],
  );
  const pageSizeCollection = useMemo(
    () => createListCollection({ items: pageSizeSelectOptions }),
    [pageSizeSelectOptions],
  );

  const { t } = useTranslation();
  const formatPageSize = useCallback(
    (label: string) =>
      String(t("history.itemsPerPage", { count: label } as never)),
    [t],
  );

  return (
    <>
      <SettingsSelect
        collection={modeCollection}
        value={[modeTag]}
        onValueChange={(details) => {
          const next = details.value[0];
          if (next) onModeChange(next as MatchModeTag);
        }}
      />

      <div></div>

      <SettingsSelect
        collection={pageSizeCollection}
        value={[String(pageSize)]}
        onValueChange={(details) => {
          const next = details.value[0];
          if (next) onPageSizeChange(Number(next));
        }}
        formatValue={formatPageSize}
      />
    </>
  );
}
