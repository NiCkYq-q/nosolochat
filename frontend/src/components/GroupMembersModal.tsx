import { useEffect, useState } from "react";
import { inviteUserToGroup } from "../api/chats";
import { ApiError } from "../api/client";
import { searchUsers, type SearchUser } from "../api/users";

type GroupMembersModalProps = {
  isOpen: boolean;
  chatId?: number;
  members: Array<{ id: number; username: string }>;
  onClose: () => void;
};

const MIN_QUERY_LENGTH = 2;

export default function GroupMembersModal({
  isOpen,
  chatId,
  members,
  onClose,
}: GroupMembersModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const memberIds = new Set(members.map((member) => member.id));
  const canInvite = chatId !== undefined;

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setIsSearching(false);
      setInvitingId(null);
      setError(null);
      setSuccessMessage(null);
      return;
    }

    if (!canInvite) {
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
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
  }, [isOpen, query, canInvite]);

  const handleInvite = async (user: SearchUser) => {
    if (chatId === undefined) {
      return;
    }

    setInvitingId(user.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await inviteUserToGroup(chatId, user.id);
      setSuccessMessage(`Приглашение отправлено пользователю ${user.username}`);
      setQuery("");
      setResults([]);
    } catch (inviteError) {
      const message =
        inviteError instanceof ApiError ? inviteError.message : "Не удалось отправить приглашение";
      setError(message);
    } finally {
      setInvitingId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  const trimmedQuery = query.trim();
  const showMinLengthHint = canInvite && trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="members-title"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h2 id="members-title">Участники группы</h2>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>

        <ul className="members-list">
          {members.map((member) => (
            <li key={member.id} className="members-list-item">
              {member.username}
            </li>
          ))}
        </ul>

        {canInvite && (
          <>
            <h3 className="members-add-title">Добавить участника</h3>

            <label className="field">
              <span>Поиск по логину</span>
              <input
                type="text"
                placeholder="Введите логин пользователя"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
              />
            </label>

            {showMinLengthHint && (
              <p className="modal-hint">
                Введите минимум {String(MIN_QUERY_LENGTH)} символа для поиска
              </p>
            )}

            {isSearching && <p className="modal-hint">Поиск...</p>}

            <ul className="search-results">
              {results
                .filter((user) => !memberIds.has(user.id))
                .map((user) => (
                  <li key={user.id} className="search-result-item">
                    <span>{user.username}</span>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={invitingId !== null}
                      onClick={() => {
                        void handleInvite(user);
                      }}
                    >
                      {invitingId === user.id ? "Отправка..." : "Пригласить"}
                    </button>
                  </li>
                ))}
            </ul>
          </>
        )}

        {successMessage !== null && <p className="modal-success">{successMessage}</p>}
        {error !== null && <p className="form-error">{error}</p>}
      </section>
    </div>
  );
}
