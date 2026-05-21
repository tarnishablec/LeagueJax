/** @jsxImportSource solid-js */
import { Dialog } from "@ark-ui/solid/dialog";
import { Search, X } from "lucide-solid";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";
import type { LcuChatFriend } from "@/bindings/lcu_chat";
import type { SgpServersConfig } from "@/bindings/sgp";
import type { SummonerSearchResult } from "@/bindings/summoner";
import { useSolidHistorySearch } from "@/features/history/hooks/useHistorySearch";
import { useSolidLcuFriends } from "@/features/history/hooks/useLcuFriends";
import { useSolidTranslation } from "@/i18n/solid";
import { FriendShortcutList } from "./FriendShortcutList";
import * as s from "./HistoryToolbar.css";
import { SearchForm } from "./SearchForm";
import { SearchResultList } from "./SearchResultList";

type HistorySearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SgpServersConfig;
  disabled: boolean;
  onOpenResult: (result: SummonerSearchResult) => void;
  onOpenFriend: (friend: LcuChatFriend, sgpServerId: string | null) => void;
};

export function HistorySearchDialog(
  props: HistorySearchDialogProps,
): JSX.Element {
  const { t } = useSolidTranslation();
  const { server, search, errorMessage } = useSolidHistorySearch({
    open: () => props.open,
    config: () => props.config,
    enabled: () => !props.disabled,
  });
  const friends = useSolidLcuFriends({
    enabled: () => props.open && !props.disabled,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && props.disabled) {
      props.onOpenChange(false);
      return;
    }

    props.onOpenChange(nextOpen);
  };

  const handleOpenFriend = (friend: LcuChatFriend) => {
    props.onOpenFriend(friend, server.effectiveServerCode());
  };

  return (
    <Dialog.Root
      open={props.open}
      lazyMount
      unmountOnExit
      onOpenChange={(details) => handleOpenChange(details.open)}
      closeOnEscape
    >
      <Dialog.Trigger
        asChild={(getTriggerProps) => (
          <button
            {...getTriggerProps({
              type: "button",
              class: s.triggerButton,
              "aria-label": t("history.searchDialog.open"),
              disabled: props.disabled,
            })}
          >
            <Search size={15} aria-hidden="true" />
          </button>
        )}
      />

      <Portal>
        <Dialog.Backdrop class={s.dialogBackdrop} />
        <Dialog.Positioner class={s.dialogPositioner}>
          <Dialog.Content class={s.dialogContent}>
            <div class={s.headerRow}>
              <div class={s.headerText}>
                <Dialog.Title class={s.title}>
                  {t("history.searchDialog.title")}
                </Dialog.Title>
              </div>
              <Dialog.CloseTrigger
                asChild={(getCloseProps) => (
                  <button
                    {...getCloseProps({
                      type: "button",
                      class: s.closeButton,
                      "aria-label": t("common.cancel"),
                    })}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              />
            </div>

            <SearchForm server={server} search={search} />

            <div class={s.contentGrid}>
              <div class={s.resultPanel}>
                <SearchResultList
                  results={search.results()}
                  searched={search.searched()}
                  isSearching={search.isSearching()}
                  hasError={!!errorMessage()}
                  onOpenResult={props.onOpenResult}
                />
              </div>
              <FriendShortcutList
                friends={friends.friends()}
                isLoading={friends.isLoading()}
                errorMessage={friends.errorMessage()}
                onRefresh={friends.refresh}
                onOpenFriend={handleOpenFriend}
              />
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
