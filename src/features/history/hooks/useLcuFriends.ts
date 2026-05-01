import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { LcuChatFriend } from "@/bindings/lcu_chat";

type UseLcuFriendsParams = {
  enabled: boolean;
};

type UseLcuFriendsResult = {
  friends: LcuChatFriend[];
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => void;
};

export function useLcuFriends({
  enabled,
}: UseLcuFriendsParams): UseLcuFriendsResult {
  const [friends, setFriends] = useState<LcuChatFriend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFriends = useCallback((isCancelled: () => boolean) => {
    setIsLoading(true);
    setErrorMessage(null);

    void invoke<LcuChatFriend[]>("lcu_get_chat_friends")
      .then((payload) => {
        if (isCancelled()) {
          return;
        }
        setFriends(payload.filter((friend) => friend.puuid.trim().length > 0));
      })
      .catch((error) => {
        if (isCancelled()) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to load friends.";
        setFriends([]);
        setErrorMessage(message);
      })
      .finally(() => {
        if (!isCancelled()) {
          setIsLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setFriends([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    loadFriends(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [enabled, loadFriends]);

  const refresh = useCallback(() => {
    if (!enabled || isLoading) {
      return;
    }
    loadFriends(() => false);
  }, [enabled, isLoading, loadFriends]);

  return {
    friends,
    isLoading,
    errorMessage,
    refresh,
  };
}
