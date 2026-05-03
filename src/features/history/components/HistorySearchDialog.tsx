import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LcuChatFriend } from "@/bindings/lcu_chat";
import type { SgpServersConfig } from "@/bindings/sgp";
import type { SummonerSearchResult } from "@/bindings/summoner";
import { useHistorySearch } from "@/features/history/hooks/useHistorySearch";
import { useLcuFriends } from "@/features/history/hooks/useLcuFriends";
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

export function HistorySearchDialog({
  open,
  onOpenChange,
  config,
  disabled,
  onOpenResult,
  onOpenFriend,
}: HistorySearchDialogProps) {
  const { t } = useTranslation();
  const { server, search, errorMessage } = useHistorySearch({
    open,
    config,
    enabled: !disabled,
  });
  const friends = useLcuFriends({
    enabled: open && !disabled,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && disabled) {
      onOpenChange(false);
      return;
    }

    onOpenChange(nextOpen);
  };

  const handleOpenFriend = (friend: LcuChatFriend) => {
    onOpenFriend(friend, server.effectiveServerCode);
  };

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
          disabled={disabled}
        >
          <Search size={15} aria-hidden="true" />
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
                {/*<Dialog.Description className={s.subtitle}>*/}
                {/*  {t("history.searchDialog.subtitle")}*/}
                {/*</Dialog.Description>*/}
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

            <SearchForm server={server} search={search} />

            {/*<div className={s.metaRow}>*/}
            {/*  {server.isBootstrapping ? (*/}
            {/*    <span className={s.metaText}>*/}
            {/*      {t("history.searchDialog.loadingServers")}*/}
            {/*    </span>*/}
            {/*  ) : null}*/}
            {/*  {errorMessage ? (*/}
            {/*    <span className={s.errorText}>{errorMessage}</span>*/}
            {/*  ) : null}*/}
            {/*</div>*/}

            <div className={s.contentGrid}>
              <div className={s.resultPanel}>
                <SearchResultList
                  results={search.results}
                  searched={search.searched}
                  isSearching={search.isSearching}
                  hasError={!!errorMessage}
                  onOpenResult={onOpenResult}
                />
              </div>
              <FriendShortcutList
                friends={friends.friends}
                isLoading={friends.isLoading}
                errorMessage={friends.errorMessage}
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
