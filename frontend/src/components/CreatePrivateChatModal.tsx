import { useEffect, useState } from "react";
import { createPrivateChat } from "../api/chats";
import { ApiError } from "../api/client";
import { searchUsers, type SearchUser } from "../api/users";

type CreatePrivateChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: number) => void;
  onRequestSent: () => void;
};

const MIN_QUERY_LENGTH = 2;

export default function CreatePrivateChatModal({
  isOpen,
  onClose,
  onChatCreated,
  onRequestSent,
}: CreatePrivateChatModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [creatingUserId, setCreatingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      setSuccessMessage(null);
      setIsSearching(false);
      setCreatingUserId(null);
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const users = await searchUsers(trimmedQuery);
          setResults(users);
        } catch (searchError) {
          const message =
            searchError instanceof ApiError ? searchError.message : "Не удалось выполнить поиск";
          setError(message);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, query]);

  const handleCreateChat = async (user: SearchUser) => {
    setCreatingUserId(user.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await createPrivateChat(user.id);

      if ("pending" in result) {
        setSuccessMessage(`Запрос отправлен пользователю ${user.username}`);
        onRequestSent();
        return;
      }

      if ("chatId" in result) {
        onChatCreated(result.chatId);
        onClose();
      }
    } catch (createError) {
      const message =
        createError instanceof ApiError ? createError.message : "Не удалось отправить запрос";
      setError(message);
    } finally {
      setCreatingUserId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  const trimmedQuery = query.trim();
  const showMinLengthHint = trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-chat-title"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h2 id="create-chat-title">Новый чат</h2>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>

        <label className="field">
          <span>Поиск пользователя</span>
          <input
            type="text"
            placeholder="Введите логин пользователя"
            value={query}
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>

        {showMinLengthHint && (
          <p className="modal-hint">Введите минимум {String(MIN_QUERY_LENGTH)} символа для поиска</p>
        )}

        {isSearching && <p className="modal-hint">Поиск...</p>}

        {!isSearching && trimmedQuery.length >= MIN_QUERY_LENGTH && results.length === 0 && (
          <p className="modal-hint">Пользователи не найдены</p>
        )}

        {successMessage !== null && <p className="modal-success">{successMessage}</p>}
        {error !== null && <p className="form-error">{error}</p>}

        <ul className="search-results">
          {results.map((user) => (
            <li key={user.id} className="search-result-item">
              <span>{user.username}</span>
              <button
                type="button"
                className="primary-button"
                disabled={creatingUserId !== null}
                onClick={() => {
                  void handleCreateChat(user);
                }}
              >
                {creatingUserId === user.id ? "Отправка..." : "Начать чат"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
