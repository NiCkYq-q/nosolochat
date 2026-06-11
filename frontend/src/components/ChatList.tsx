import { useCallback, useEffect, useRef, useState } from "react";
import { fetchChats, type ChatListItem } from "../api/chats";
import { ApiError } from "../api/client";
import { useAuth } from "../context/useAuth";
import { useChatListSocket } from "../hooks/useChatListSocket";
import ChatListItemView from "./ChatListItem";

type ChatListProps = {
  refreshKey: number;
};

export default function ChatList({ refreshKey }: ChatListProps) {
  const { initialChats } = useAuth();
  const hasUsedInitialChats = useRef(false);
  const [chats, setChats] = useState<ChatListItem[]>(() => initialChats ?? []);
  const [isLoading, setIsLoading] = useState(initialChats === null);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent !== true) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const data = await fetchChats();
      setChats(data);
    } catch (loadError) {
      if (options?.silent !== true) {
        const message = loadError instanceof ApiError ? loadError.message : "Не удалось загрузить чаты";
        setError(message);
        setChats([]);
      }
    } finally {
      if (options?.silent !== true) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (refreshKey === 0 && initialChats !== null && !hasUsedInitialChats.current) {
      hasUsedInitialChats.current = true;
      setChats(initialChats);
      setIsLoading(false);
      return;
    }

    void loadChats();
  }, [loadChats, refreshKey, initialChats]);

  useChatListSocket({
    onUpdate: setChats,
    onPresenceChange: () => {
      void loadChats({ silent: true });
    },
  });

  if (isLoading) {
    return (
      <div className="chat-list-skeleton" aria-busy="true" aria-label="Загрузка чатов">
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="chat-list-empty">
        <p className="form-error">{error}</p>
        <button type="button" className="secondary-button" onClick={() => void loadChats()}>
          Повторить
        </button>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="chat-list-empty">
        <p>У вас пока нет чатов</p>
      </div>
    );
  }

  return (
    <ul className="chat-list">
      {chats.map((chat) => (
        <li key={chat.id}>
          <ChatListItemView chat={chat} />
        </li>
      ))}
    </ul>
  );
}
