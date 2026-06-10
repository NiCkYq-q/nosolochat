import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteUserByAdmin, fetchAdminUsers, type AdminUser } from "../api/admin";
import { ApiError } from "../api/client";
import AdminDeleteUserDialog from "../components/AdminDeleteUserDialog";
import { formatPresenceStatus } from "../utils/formatPresenceStatus";
import { formatMessageTime } from "../utils/formatTime";

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (loadError) {
      const message =
        loadError instanceof ApiError ? loadError.message : "Не удалось загрузить пользователей";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleDelete = async () => {
    if (deleteTarget === null) {
      return;
    }

    setActionError(null);
    try {
      await deleteUserByAdmin(deleteTarget.id);
      setDeleteTarget(null);
      await loadUsers();
    } catch (deleteError) {
      const message =
        deleteError instanceof ApiError ? deleteError.message : "Не удалось удалить пользователя";
      setActionError(message);
      setDeleteTarget(null);
    }
  };

  return (
    <main className="page admin-page">
      <header className="admin-header">
        <div>
          <h1>Панель администратора</h1>
          <p className="home-subtitle">Управление пользователями</p>
        </div>
        <Link to="/" className="secondary-button admin-back-link">
          ← К чатам
        </Link>
      </header>

      {error !== null && <p className="form-error">{error}</p>}
      {actionError !== null && <p className="form-error">{actionError}</p>}

      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Регистрация</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role === "admin" ? "Админ" : "Пользователь"}</td>
                  <td>
                    {user.isOnline
                      ? "В сети"
                      : formatPresenceStatus(false, user.lastSeen)}
                  </td>
                  <td>{formatMessageTime(user.createdAt)}</td>
                  <td>
                    {user.role !== "admin" && (
                      <button
                        type="button"
                        className="link-button admin-delete-link"
                        onClick={() => {
                          setDeleteTarget(user);
                        }}
                      >
                        Удалить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget !== null && (
        <AdminDeleteUserDialog
          isOpen={true}
          username={deleteTarget.username}
          onCancel={() => {
            setDeleteTarget(null);
          }}
          onConfirm={() => {
            void handleDelete();
          }}
        />
      )}
    </main>
  );
}
