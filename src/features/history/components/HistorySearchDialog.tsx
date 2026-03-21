import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SgpServersConfig } from "@/bindings/sgp";
import type { SummonerSearchResult } from "@/bindings/summoner";
import { SettingsSelect } from "@/components/settings-ui";
import { useHistorySearch } from "@/features/history/hooks/useHistorySearch";
import * as s from "./HistoryToolbar.css";

type HistorySearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SgpServersConfig;
  onOpenResult: (result: SummonerSearchResult) => void;
};

export function HistorySearchDialog({
  open,
  onOpenChange,
  config,
  onOpenResult,
}: HistorySearchDialogProps) {
  const { t } = useTranslation();
  const { server, search, errorMessage } = useHistorySearch({ open, config });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      server.reset();
    }
    onOpenChange(nextOpen);
  };

  const hasResults = search.results.length > 0;

  return (
    <Dialog.Root
      open={open}
      lazyMount
      unmountOnExit
      onOpenChange={(details) => handleOpenChange(details.open)}
      closeOnEscape
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={s.triggerButton}
          aria-label={t("history.searchDialog.open")}
        >
          <Search size={14} aria-hidden="true" />
          <span>{t("history.searchDialog.open")}</span>
        </button>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop className={s.dialogBackdrop} />
        <Dialog.Positioner className={s.dialogPositioner}>
          <Dialog.Content className={s.dialogContent}>
            <div className={s.headerRow}>
              <div className={s.headerText}>
                <Dialog.Title className={s.title}>
                  {t("history.searchDialog.title")}
                </Dialog.Title>
                <Dialog.Description className={s.subtitle}>
                  {t("history.searchDialog.subtitle")}
                </Dialog.Description>
              </div>
              <Dialog.CloseTrigger asChild>
                <button
                  type="button"
                  className={s.closeButton}
                  aria-label={t("common.cancel")}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </Dialog.CloseTrigger>
            </div>

            <form
              className={server.show ? s.searchRow : s.searchRowNoServer}
              onSubmit={(event) => {
                event.preventDefault();
                void search.handleSearch();
              }}
            >
              {server.show ? (
                <SettingsSelect
                  collection={server.collection}
                  value={[server.selectedId]}
                  onValueChange={(details) => {
                    const next = details.value[0];
                    if (next != null) server.setSelectedId(next);
                  }}
                  disabled={server.disabled}
                  placeholder={t("history.searchDialog.focused")}
                />
              ) : null}
              <input
                type="text"
                className={s.searchInput}
                placeholder={t("history.searchDialog.placeholder")}
                value={search.query}
                disabled={search.isSearching}
                onChange={(event) => search.setQuery(event.target.value)}
              />
              <button
                type="submit"
                className={s.searchButton}
                disabled={
                  search.isSearching ||
                  server.isBootstrapping ||
                  search.query.trim().length === 0
                }
              >
                {search.isSearching
                  ? t("common.loading")
                  : t("history.searchDialog.submit")}
              </button>
            </form>

            <div className={s.metaRow}>
              {server.isBootstrapping ? (
                <span className={s.metaText}>
                  {t("history.searchDialog.loadingServers")}
                </span>
              ) : null}
              {errorMessage ? (
                <span className={s.errorText}>{errorMessage}</span>
              ) : null}
            </div>

            <div className={s.resultPanel}>
              {hasResults ? (
                <div className={s.resultList}>
                  {search.results.map((result) => (
                    <button
                      key={`${result.puuid}:${result.sgpServerId}`}
                      type="button"
                      className={s.resultButton}
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
              ) : search.searched && !search.isSearching && !errorMessage ? (
                <div className={s.emptyText}>
                  {t("history.searchDialog.noResults")}
                </div>
              ) : (
                <div className={s.emptyText}>
                  {t("history.searchDialog.hint")}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
