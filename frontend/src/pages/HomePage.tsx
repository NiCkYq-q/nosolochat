import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ChatList from "../components/ChatList";
import CreateGroupModal from "../components/CreateGroupModal";
import CreatePrivateChatModal from "../components/CreatePrivateChatModal";
import DeleteAccountModal from "../components/DeleteAccountModal";
import InvitesPanel from "../components/InvitesPanel";
import { useAuth } from "../context/useAuth";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleChatCreated = (chatId: number) => {
    setRefreshKey((value) => value + 1);
    void navigate(`/chats/${String(chatId)}`);
  };

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  return (
    <main className="home-page">
      <div className="home-page-top">
        <header className="home-header">
          <div>
            <h1>NoSoloChat</h1>
            <p className="home-subtitle">Вы вошли как {user?.username}</p>
          </div>
          <div className="home-header-actions">
            {user?.role === "admin" && (
              <Link to="/admin" className="secondary-button">
                Админ
              </Link>
            )}
            <button
              type="button"
              className="secondary-button home-danger-button"
              onClick={() => {
                setIsDeleteAccountOpen(true);
              }}
            >
              Удалить аккаунт
            </button>
            <button type="button" className="secondary-button" onClick={logout}>
              Выйти
            </button>
          </div>
        </header>

        <InvitesPanel onInviteHandled={handleRefresh} />

        <div className="home-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setIsPrivateModalOpen(true);
            }}
          >
            Новый чат
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsGroupModalOpen(true);
            }}
          >
            Создать группу
          </button>
        </div>
      </div>

      <div className="home-chat-list-scroll">
        <ChatList refreshKey={refreshKey} />
      </div>

      <CreatePrivateChatModal
        isOpen={isPrivateModalOpen}
        onClose={() => {
          setIsPrivateModalOpen(false);
        }}
        onChatCreated={handleChatCreated}
        onRequestSent={handleRefresh}
      />

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
        }}
        onGroupCreated={handleChatCreated}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        onClose={() => {
          setIsDeleteAccountOpen(false);
        }}
        onDeleted={logout}
      />
    </main>
  );
}
