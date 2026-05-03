import { Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsSelect } from "@/components/settings-ui";
import type { useHistorySearch } from "@/features/history/hooks/useHistorySearch";
import * as s from "./HistoryToolbar.css";

type SearchFormProps = {
  server: ReturnType<typeof useHistorySearch>["server"];
  search: ReturnType<typeof useHistorySearch>["search"];
};

export function SearchForm({ server, search }: SearchFormProps) {
  const { t } = useTranslation();

  return (
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
          groups={server.groups}
          value={[server.selectedId]}
          onValueChange={(details) => {
            const next = details.value[0];
            if (next != null) server.setSelectedId(next);
          }}
          disabled={server.disabled}
          placeholder={t("history.searchDialog.focused")}
          disablePortal
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
        aria-busy={search.isSearching}
        className={s.searchButton}
        data-loading={search.isSearching ? "true" : undefined}
        disabled={
          search.isSearching ||
          server.isBootstrapping ||
          search.query.trim().length === 0
        }
      >
        <span
          className={`${s.searchButtonLabel} ${
            search.isSearching ? s.searchButtonLabelHidden : ""
          }`}
        >
          {t("history.searchDialog.submit")}
        </span>
        <span
          className={`${s.searchButtonLoader} ${
            search.isSearching ? s.searchButtonLoaderVisible : ""
          }`}
          aria-hidden="true"
        >
          <Loader size={14} className={s.searchButtonIconSpin} />
        </span>
      </button>
    </form>
  );
}
