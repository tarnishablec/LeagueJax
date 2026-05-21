/** @jsxImportSource solid-js */
import { Loader } from "lucide-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { SettingsSelect } from "@/components/settings-ui";
import type { useSolidHistorySearch } from "@/features/history/hooks/useHistorySearch";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./HistoryToolbar.css";

type SearchFormProps = {
  server: ReturnType<typeof useSolidHistorySearch>["server"];
  search: ReturnType<typeof useSolidHistorySearch>["search"];
};

export function SearchForm(props: SearchFormProps): JSX.Element {
  const { t } = useSolidTranslation();

  return (
    <form
      class={props.server.show() ? s.searchRow : s.searchRowNoServer}
      onSubmit={(event) => {
        event.preventDefault();
        void props.search.handleSearch();
      }}
    >
      <Show when={props.server.show()}>
        <SettingsSelect
          collection={props.server.collection()}
          groups={props.server.groups()}
          value={[props.server.selectedId()]}
          onValueChange={(details) => {
            const next = details.value[0];
            if (next != null) {
              props.server.setSelectedId(next);
            }
          }}
          disabled={props.server.disabled()}
          placeholder={t("history.searchDialog.focused")}
          disablePortal
        />
      </Show>
      <input
        type="text"
        class={s.searchInput}
        placeholder={t("history.searchDialog.placeholder")}
        value={props.search.query()}
        disabled={props.search.isSearching()}
        onInput={(event) => props.search.setQuery(event.currentTarget.value)}
      />
      <button
        type="submit"
        aria-busy={props.search.isSearching()}
        class={s.searchButton}
        data-loading={props.search.isSearching() ? "true" : undefined}
        disabled={
          props.search.isSearching() ||
          props.server.isBootstrapping() ||
          props.search.query().trim().length === 0
        }
      >
        <span
          class={`${s.searchButtonLabel} ${
            props.search.isSearching() ? s.searchButtonLabelHidden : ""
          }`}
        >
          {t("history.searchDialog.submit")}
        </span>
        <span
          class={`${s.searchButtonLoader} ${
            props.search.isSearching() ? s.searchButtonLoaderVisible : ""
          }`}
          aria-hidden="true"
        >
          <Loader size={14} class={s.searchButtonIconSpin} />
        </span>
      </button>
    </form>
  );
}
