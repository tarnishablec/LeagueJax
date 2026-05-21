import { invoke } from "@tauri-apps/api/core";
import type { Accessor } from "solid-js";
import { createEffect, createSignal } from "solid-js";
import type { LcuChatFriend } from "@/bindings/lcu_chat";

type UseLcuFriendsResult = {
  friends: Accessor<LcuChatFriend[]>;
  isLoading: Accessor<boolean>;
  errorMessage: Accessor<string | null>;
  refresh: () => void;
};

export function useSolidLcuFriends(params: {
  enabled: Accessor<boolean>;
}): UseLcuFriendsResult {
  const [friends, setFriends] = createSignal<LcuChatFriend[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  let requestId = 0;

  const loadFriends = () => {
    const currentRequestId = ++requestId;
    setIsLoading(true);
    setErrorMessage(null);

    void invoke<LcuChatFriend[]>("lcu_get_chat_friends")
      .then((payload) => {
        if (requestId !== currentRequestId) {
          return;
        }
        setFriends(payload.filter((friend) => friend.puuid.trim().length > 0));
      })
      .catch((error) => {
        if (requestId !== currentRequestId) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to load friends.";
        setFriends([]);
        setErrorMessage(message);
      })
      .finally(() => {
        if (requestId === currentRequestId) {
          setIsLoading(false);
        }
      });
  };

  createEffect(() => {
    if (!params.enabled()) {
      requestId += 1;
      setFriends([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    loadFriends();
  });

  const refresh = () => {
    if (!params.enabled() || isLoading()) {
      return;
    }
    loadFriends();
  };

  return {
    friends,
    isLoading,
    errorMessage,
    refresh,
  };
}
