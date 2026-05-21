/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { createMemo, createSignal, Show } from "solid-js";
import type { LcuChatFriend } from "@/bindings/lcu_chat";
import { ProfileIcon } from "@/components/ProfileIcon";
import { RefreshButton } from "@/components/RefreshButton";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./HistoryToolbar.css";

type FriendSection = {
  id: "online" | "offline";
  titleKey: string;
  friends: LcuChatFriend[];
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function friendDisplayName(friend: LcuChatFriend): string {
  const gameName = friend.gameName.trim() || friend.name.trim() || "Summoner";
  const tag = friend.gameTag.trim();
  return tag.length > 0 ? `${gameName}#${tag}` : gameName;
}

function friendDisplayGroupName(friend: LcuChatFriend): string {
  const displayGroupName = friend.displayGroupName.trim();
  return displayGroupName === "**Default" ? "" : displayGroupName;
}

function isOffline(friend: LcuChatFriend): boolean {
  return friend.availability.trim().toLocaleLowerCase() === "offline";
}

function isInGame(friend: LcuChatFriend): boolean {
  const status = normalize(friend.lol.gameStatus);
  return status.length > 0 && status !== "outofgame";
}

function friendStatusKey(friend: LcuChatFriend): string {
  if (isOffline(friend)) {
    return "offline";
  }

  if (isInGame(friend)) {
    return "inGame";
  }

  const availability = normalize(friend.availability);
  if (
    availability === "away" ||
    availability === "dnd" ||
    availability === "mobile" ||
    availability === "spectating"
  ) {
    return availability;
  }

  return "online";
}

function friendStatusClass(friend: LcuChatFriend): string {
  const key = friendStatusKey(friend);
  if (key === "offline") {
    return s.friendStatus.offline;
  }
  if (key === "away" || key === "dnd" || key === "mobile") {
    return s.friendStatus.away;
  }
  if (key === "inGame" || key === "spectating") {
    return s.friendStatus.inGame;
  }
  return s.friendStatus.online;
}

function compareFriends(a: LcuChatFriend, b: LcuChatFriend): number {
  const statusRank = Number(isOffline(a)) - Number(isOffline(b));
  if (statusRank !== 0) {
    return statusRank;
  }

  return friendDisplayName(a).localeCompare(friendDisplayName(b), undefined, {
    sensitivity: "base",
  });
}

function resolveFriendSections(
  friends: LcuChatFriend[],
  query: string,
): FriendSection[] {
  const normalizedQuery = normalize(query);
  const filtered =
    normalizedQuery.length === 0
      ? friends
      : friends.filter((friend) => {
          const haystack = normalize(
            [
              friendDisplayName(friend),
              `${friend.gameName}#${friend.gameTag}`,
              friend.gameName,
              friend.gameTag,
              friend.name,
              friend.puuid,
            ].join(" "),
          );
          return haystack.includes(normalizedQuery);
        });

  const sorted = filtered.toSorted(compareFriends);
  const online = sorted.filter((friend) => !isOffline(friend));
  const offline = sorted.filter(isOffline);

  return [
    {
      id: "online",
      titleKey: "history.searchDialog.friendsOnline",
      friends: online,
    },
    {
      id: "offline",
      titleKey: "history.searchDialog.friendsOffline",
      friends: offline,
    },
  ].filter((section) => section.friends.length > 0) as FriendSection[];
}

function FriendAvatar(props: { icon: number }): JSX.Element {
  return (
    <ProfileIcon
      profileIconId={props.icon}
      alt=""
      className={s.friendAvatar}
      fallbackClassName={s.friendAvatarFallback}
    />
  );
}

function FriendRow(props: {
  friend: LcuChatFriend;
  onOpenFriend: (friend: LcuChatFriend) => void;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const displayName = () => friendDisplayName(props.friend);
  const displayGroupName = () => friendDisplayGroupName(props.friend);
  const statusKey = () => friendStatusKey(props.friend);

  return (
    <button
      type="button"
      class={s.friendButton}
      aria-label={`Open match history for ${displayName()}`}
      onClick={() => props.onOpenFriend(props.friend)}
    >
      <FriendAvatar icon={props.friend.icon} />
      <span class={s.friendInfo}>
        <span class={s.friendName}>{displayName()}</span>
        <span class={s.friendMeta}>{displayGroupName()}</span>
      </span>
      <span class={friendStatusClass(props.friend)}>
        {t(`history.searchDialog.friendStatus.${statusKey()}`)}
      </span>
    </button>
  );
}

export function FriendShortcutList(props: {
  friends: LcuChatFriend[];
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onOpenFriend: (friend: LcuChatFriend) => void;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const [friendQuery, setFriendQuery] = createSignal("");
  const sections = createMemo(() =>
    resolveFriendSections(props.friends, friendQuery()),
  );
  const hasQuery = () => friendQuery().trim().length > 0;

  const emptyText = createMemo(() => {
    if (props.errorMessage) {
      return t("history.searchDialog.friendsError");
    }
    if (props.isLoading && props.friends.length === 0) {
      return t("history.searchDialog.friendsLoading");
    }
    if (props.friends.length === 0) {
      return t("history.searchDialog.friendsEmpty");
    }
    if (sections().length === 0 && hasQuery()) {
      return t("history.searchDialog.friendsNoMatches");
    }
    return null;
  });
  const friendSections = keyArray(
    sections,
    (section) => section.id,
    (section) => {
      const friendRows = keyArray(
        () => section().friends,
        (friend) => friend.puuid,
        (friend) => (
          <FriendRow friend={friend()} onOpenFriend={props.onOpenFriend} />
        ),
      );

      return (
        <div class={s.friendSection}>
          <div class={s.friendSectionTitle}>
            <span>{t(section().titleKey)}</span>
            <span>{section().friends.length}</span>
          </div>
          {friendRows()}
        </div>
      );
    },
  );

  return (
    <aside class={s.friendPanel}>
      <div class={s.friendHeader}>
        <div class={s.friendHeaderText}>
          <span class={s.friendTitle}>
            {t("history.searchDialog.friendsTitle")}
          </span>
          <span class={s.friendCount}>
            {t("history.searchDialog.friendsCount", {
              count: props.friends.length,
            })}
          </span>
        </div>
        <input
          class={s.friendSearchInput}
          value={friendQuery()}
          onInput={(event) => setFriendQuery(event.currentTarget.value)}
          placeholder={t("history.searchDialog.friendsSearchPlaceholder")}
          aria-label="Search friends"
        />
        <RefreshButton
          loading={props.isLoading}
          onClick={props.onRefresh}
          ariaLabel="Refresh friends"
          size={13}
          minLoadingMs={1000}
        />
      </div>

      <div class={s.friendList}>
        <Show when={emptyText()}>
          {(text) => <div class={s.friendEmptyText}>{text()}</div>}
        </Show>
        {friendSections()}
      </div>
    </aside>
  );
}
