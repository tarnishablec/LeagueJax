import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SummonerSearchResult } from "@/bindings/summoner";
import { SettingsSelect } from "@/components/settings-ui";
import * as s from "./HistoryToolbar.css";

type SelectOption = {
  value: string;
  label: string;
};

type HistorySearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showServerSelect: boolean;
  selectedServerId: string;
  onSelectedServerIdChange: (serverId: string) => void;
  serverOptions: SelectOption[];
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => Promise<void>;
  isSearching: boolean;
  isBootstrapping: boolean;
  errorMessage: string | null;
  results: SummonerSearchResult[];
  searched: boolean;
  onOpenResult: (result: SummonerSearchResult) => void;
};

export function HistorySearchDialog({
  open,
  onOpenChange,
  showServerSelect,
  selectedServerId,
  onSelectedServerIdChange,
  serverOptions,
  query,
  onQueryChange,
  onSearch,
  isSearching,
  isBootstrapping,
  errorMessage,
  results,
  searched,
  onOpenResult,
}: HistorySearchDialogProps) {
  const { t } = useTranslation();

  const hasResults = results.length > 0;

  return (
    <Dialog.Root
      open={open}
      lazyMount
      unmountOnExit
      onOpenChange={(details) => onOpenChange(details.open)}
      closeOnEscape
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={s.triggerButton}
          aria-label="Open summoner search dialog"
        >
          <Search size={14} aria-hidden="true" />
          <span>{t("history.search.open", { defaultValue: "Search" })}</span>
        </button>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop className={s.dialogBackdrop} />
        <Dialog.Positioner className={s.dialogPositioner}>
          <Dialog.Content className={s.dialogContent}>
            <div className={s.headerRow}>
              <div className={s.headerText}>
                <Dialog.Title className={s.title}>
                  {t("history.search.title", {
                    defaultValue: "Search Summoner",
                  })}
                </Dialog.Title>
                <Dialog.Description className={s.subtitle}>
                  {t("history.search.subtitle", {
                    defaultValue:
                      "Supports puuid, gameName#tagLine, or fuzzy gameName.",
                  })}
                </Dialog.Description>
              </div>
              <Dialog.CloseTrigger asChild>
                <button
                  type="button"
                  className={s.closeButton}
                  aria-label="Close search dialog"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </Dialog.CloseTrigger>
            </div>

            <form
              className={showServerSelect ? s.searchRow : s.searchRowNoServer}
              onSubmit={(event) => {
                event.preventDefault();
                void onSearch();
              }}
            >
              {showServerSelect ? (
                <SettingsSelect
                  ariaLabel="Summoner search server"
                  value={selectedServerId}
                  options={serverOptions}
                  onValueChange={onSelectedServerIdChange}
                />
              ) : null}
              <input
                type="text"
                className={s.searchInput}
                placeholder={t("history.search.placeholder", {
                  defaultValue: "gameName#tagLine / gameName / puuid",
                })}
                value={query}
                disabled={isSearching}
                onChange={(event) => onQueryChange(event.target.value)}
              />
              <button
                type="submit"
                className={s.searchButton}
                aria-label="Execute summoner search"
                disabled={
                  isSearching || isBootstrapping || query.trim().length === 0
                }
              >
                {isSearching
                  ? t("common.loading", { defaultValue: "Loading..." })
                  : t("history.search.submit", { defaultValue: "Search" })}
              </button>
            </form>

            <div className={s.metaRow}>
              {isBootstrapping ? (
                <span className={s.metaText}>
                  {t("history.search.loadingServers", {
                    defaultValue: "Loading server context...",
                  })}
                </span>
              ) : null}
              {errorMessage ? (
                <span className={s.errorText}>{errorMessage}</span>
              ) : null}
            </div>

            <div className={s.resultPanel}>
              {hasResults ? (
                <div className={s.resultList}>
                  {results.map((result) => (
                    <button
                      key={`${result.puuid}:${result.sgpServerId}`}
                      type="button"
                      className={s.resultButton}
                      aria-label={`Open history tab for ${result.gameName}#${result.tagLine}`}
                      onClick={() => onOpenResult(result)}
                    >
                      <span className={s.resultName}>
                        {result.gameName}
                        {result.tagLine.length > 0 ? `#${result.tagLine}` : ""}
                      </span>
                      <span className={s.resultMeta}>
                        <span>{result.sgpServerId}</span>
                        <span>Lv.{result.summonerLevel}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : searched && !isSearching && !errorMessage ? (
                <div className={s.emptyText}>
                  {t("history.search.noResults", {
                    defaultValue: "No summoner found for this query.",
                  })}
                </div>
              ) : (
                <div className={s.emptyText}>
                  {t("history.search.hint", {
                    defaultValue: "Search results will appear here.",
                  })}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
