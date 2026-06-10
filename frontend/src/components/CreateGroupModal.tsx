import { useEffect, useState } from "react";
import { createGroupChat } from "../api/chats";
import { ApiError } from "../api/client";
import { searchUsers, type SearchUser } from "../api/users";

type CreateGroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (chatId: number) => void;
};

const MIN_QUERY_LENGTH = 2;

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setQuery("");
      setResults([]);
      setSelectedMembers([]);
      setError(null);
      setIsSearching(false);
      setIsSubmitting(false);
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
  }, [isOpen, query]);

  const selectedIds = new Set(selectedMembers.map((member) => member.id));

  const toggleMember = (user: SearchUser) => {
    setSelectedMembers((current) => {
      if (current.some((member) => member.id === user.id)) {
        return current.filter((member) => member.id !== user.id);
      }
      return [...current, user];
    });
  };

  const handleCreate = async () => {
    const trimmedName = groupName.trim();
    if (trimmedName.length === 0) {
      setError("Введите название группы");
      return;
    }

    if (selectedMembers.length === 0) {
      setError("Выберите хотя бы одного участника");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createGroupChat(
        trimmedName,
        selectedMembers.map((member) => member.id)
      );
      onGroupCreated(result.chatId);
      onClose();
    } catch (createError) {
      const message =
        createError instanceof ApiError ? createError.message : "Не удалось создать группу";
      setError(message);
    } finally {
      setIsSubmitting(false);
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
        aria-labelledby="create-group-title"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h2 id="create-group-title">Создать группу</h2>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>

        <label className="field">
          <span>Название группы</span>
          <input
            type="text"
            value={groupName}
            maxLength={64}
            placeholder="Например, Team"
            onChange={(event) => {
              setGroupName(event.target.value);
            }}
          />
        </label>

        <label className="field">
          <span>Участники</span>
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
          <p className="modal-hint">Введите минимум {String(MIN_QUERY_LENGTH)} символа для поиска</p>
        )}

        {isSearching && <p className="modal-hint">Поиск...</p>}

        {selectedMembers.length > 0 && (
          <ul className="selected-members">
            {selectedMembers.map((member) => (
              <li key={member.id}>
                <span>{member.username}</span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    toggleMember(member);
                  }}
                >
                  Убрать
                </button>
              </li>
            ))}
          </ul>
        )}

        <ul className="search-results">
          {results
            .filter((user) => !selectedIds.has(user.id))
            .map((user) => (
              <li key={user.id} className="search-result-item">
                <span>{user.username}</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    toggleMember(user);
                  }}
                >
                  Добавить
                </button>
              </li>
            ))}
        </ul>

        {error !== null && <p className="form-error">{error}</p>}

        <button
          type="button"
          className="primary-button modal-submit"
          disabled={isSubmitting}
          onClick={() => {
            void handleCreate();
          }}
        >
          {isSubmitting ? "Создание..." : "Создать и пригласить"}
        </button>
      </section>
    </div>
  );
}
