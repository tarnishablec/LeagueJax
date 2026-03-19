import { SettingsSelect } from "@/components/settings-ui";
import type { MatchModeTag } from "../hooks/use-match-history";

export function MatchListFilters({
  modeTag,
  pageSize,
  placeholderFilter,
  modeSelectOptions,
  pageSizeSelectOptions,
  filterSelectOptions,
  onModeChange,
  onPageSizeChange,
  onFilterChange,
}: {
  modeTag: MatchModeTag;
  pageSize: number;
  placeholderFilter: string;
  modeSelectOptions: Array<{ value: string; label: string }>;
  pageSizeSelectOptions: Array<{ value: string; label: string }>;
  filterSelectOptions: Array<{ value: string; label: string }>;
  onModeChange: (value: MatchModeTag) => void;
  onPageSizeChange: (value: number) => void;
  onFilterChange: (value: string) => void;
}) {
  return (
    <>
      <SettingsSelect
        ariaLabel="History mode"
        value={modeTag}
        options={modeSelectOptions}
        onValueChange={(value) => onModeChange(value as MatchModeTag)}
      />

      <SettingsSelect
        ariaLabel="History page size"
        value={String(pageSize)}
        options={pageSizeSelectOptions}
        onValueChange={(value) => onPageSizeChange(Number(value))}
      />

      <SettingsSelect
        ariaLabel="History filter placeholder"
        value={placeholderFilter}
        options={filterSelectOptions}
        onValueChange={(value) => onFilterChange(value)}
      />
    </>
  );
}
