import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LcuChatFriend } from "@/bindings/lcu_chat";
import { ProfileIcon } from "@/components/ProfileIcon";
import { RefreshButton } from "@/components/RefreshButton";
import * as s from "./HistoryToolbar.css";

type FriendShortcutListProps = {
  friends: LcuChatFriend[];
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onOpenFriend: (friend: LcuChatFriend) => void;
};

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

function useFriendSections(
  friends: LcuChatFriend[],
  query: string,
): FriendSection[] {
  return useMemo(() => {
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
  }, [friends, query]);
}

function FriendAvatar({ icon }: { icon: number }) {
  return (
    <ProfileIcon
      profileIconId={icon}
      alt=""
      className={s.friendAvatar}
      fallbackClassName={s.friendAvatarFallback}
    />
  );
}

function FriendRow({
  friend,
  onOpenFriend,
}: {
  friend: LcuChatFriend;
  onOpenFriend: (friend: LcuChatFriend) => void;
}) {
  const { t } = useTranslation();
  const displayName = friendDisplayName(friend);
  const displayGroupName = friendDisplayGroupName(friend);
  const statusKey = friendStatusKey(friend);

  return (
    <button
      type="button"
      className={s.friendButton}
      aria-label={`Open match history for ${displayName}`}
      onClick={() => onOpenFriend(friend)}
    >
      <FriendAvatar icon={friend.icon} />
      <span className={s.friendInfo}>
        <span className={s.friendName}>{displayName}</span>
        <span className={s.friendMeta}>{displayGroupName}</span>
      </span>
      <span className={friendStatusClass(friend)}>
        {t(`history.searchDialog.friendStatus.${statusKey}`)}
      </span>
    </button>
  );
}

export function FriendShortcutList({
  friends,
  isLoading,
  errorMessage,
  onRefresh,
  onOpenFriend,
}: FriendShortcutListProps) {
  const { t } = useTranslation();
  const [friendQuery, setFriendQuery] = useState("");
  const sections = useFriendSections(friends, friendQuery);
  const hasQuery = friendQuery.trim().length > 0;

  let emptyText: string | null = null;
  if (errorMessage) {
    emptyText = t("history.searchDialog.friendsError");
  } else if (isLoading && friends.length === 0) {
    emptyText = t("history.searchDialog.friendsLoading");
  } else if (friends.length === 0) {
    emptyText = t("history.searchDialog.friendsEmpty");
  } else if (sections.length === 0 && hasQuery) {
    emptyText = t("history.searchDialog.friendsNoMatches");
  }

  return (
    <aside className={s.friendPanel}>
      <div className={s.friendHeader}>
        <div className={s.friendHeaderText}>
          <span className={s.friendTitle}>
            {t("history.searchDialog.friendsTitle")}
          </span>
          <span className={s.friendCount}>
            {t("history.searchDialog.friendsCount", {
              count: friends.length,
            })}
          </span>
        </div>
        <input
          className={s.friendSearchInput}
          value={friendQuery}
          onChange={(event) => setFriendQuery(event.currentTarget.value)}
          placeholder={t("history.searchDialog.friendsSearchPlaceholder")}
          aria-label="Search friends"
        />
        <RefreshButton
          loading={isLoading}
          onClick={onRefresh}
          ariaLabel="Refresh friends"
          size={13}
          minLoadingMs={1000}
        />
      </div>

      <div className={s.friendList}>
        {emptyText ? (
          <div className={s.friendEmptyText}>{emptyText}</div>
        ) : null}
        {sections.map((section) => (
          <div key={section.id} className={s.friendSection}>
            <div className={s.friendSectionTitle}>
              <span>{t(section.titleKey)}</span>
              <span>{section.friends.length}</span>
            </div>
            {section.friends.map((friend) => (
              <FriendRow
                key={friend.id}
                friend={friend}
                onOpenFriend={onOpenFriend}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
