import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteChat,
  fetchChatDetails,
  leaveGroup,
  markChatAsRead,
  setChatNotifications as updateChatNotificationsApi,
  type ChatDetails,
} from "../api/chats";
import { ApiError } from "../api/client";
import { fetchMessages, normalizeMessageReplyTo, uploadChatImage, type Message } from "../api/messages";
import { blockUser, fetchUserStatus, unblockUser, type UserStatus } from "../api/users";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyToast from "../components/CopyToast";
import GroupMembersModal from "../components/GroupMembersModal";
import MessageComposer from "../components/MessageComposer";
import MessageList from "../components/MessageList";
import TypingIndicator from "../components/TypingIndicator";
import { useAuth } from "../context/useAuth";
import { useChatNotifications } from "../context/useChatNotifications";
import { useSocket } from "../context/useSocket";
import { emitChatMessage, useChatSocket } from "../hooks/useChatSocket";
import type {
  SocketErrorPayload,
  SocketMessagePayload,
  UserOfflinePayload,
  UserOnlinePayload,
  UserTypingPayload,
  UserTypingStopPayload,
} from "../socket/events";
import { formatPresenceStatus } from "../utils/formatPresenceStatus";
import { formatTypingIndicatorText } from "../utils/formatTypingStatus";
import { getInitials } from "../utils/initials";
import {
  resetNotificationSessionReady,
  setNotificationSessionReady,
} from "../utils/sessionReady";

export default function ChatPage() {
  const navigate = useNavigate();
  const { chatId: chatIdParam } = useParams();
  const chatId = Number(chatIdParam);
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { setNotificationsEnabled, registerChat } = useChatNotifications();

  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerStatus, setPartnerStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [replyToMessages, setReplyToMessages] = useState<Message[]>([]);
  const [isCopyToastVisible, setIsCopyToastVisible] = useState(false);
  const [typingUsers, setTypingUsers] = useState<
    Map<number, { username: string; hideTimeoutId: number }>
  >(new Map());
  const copyToastTimerRef = useRef<number | null>(null);

  const selectedReplyIds = useMemo(
    () => new Set(replyToMessages.map((message) => message.id)),
    [replyToMessages]
  );

  const partnerId = useMemo(() => {
    if (chat?.type !== "private" || user === null) {
      return null;
    }

    const partner = chat.participants.find((participant) => participant.id !== user.id);
    return partner?.id ?? null;
  }, [chat, user]);

  const appendMessage = useCallback((message: Message) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id) ? current : [...current, message]
    );
  }, []);

  const handleInitialScrollComplete = useCallback(() => {
    if (!Number.isInteger(chatId) || chatId <= 0) {
      return;
    }
    void markChatAsRead(chatId);
  }, [chatId]);

  const handleMessagesRead = useCallback(
    (payload: { chatId: number; messageIds: number[]; userId: number }) => {
      if (user === null || payload.userId === user.id) {
        return;
      }

      const readIds = new Set(payload.messageIds);
      setMessages((current) =>
        current.map((message) =>
          message.senderId === user.id && readIds.has(message.id)
            ? { ...message, readByOthers: true }
            : message
        )
      );
    },
    [user]
  );

  useChatSocket({
    chatId,
    currentUserId: user?.id ?? 0,
    onMessage: appendMessage,
    onMessagesRead: handleMessagesRead,
  });

  const loadChat = useCallback(async () => {
    if (!Number.isInteger(chatId) || chatId <= 0) {
      setError("Некорректный чат");
      setIsLoading(false);
      setNotificationSessionReady(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    resetNotificationSessionReady();

    try {
      const [chatDetails, messagesResponse] = await Promise.all([
        fetchChatDetails(chatId),
        fetchMessages(chatId),
      ]);

      setChat(chatDetails);
      registerChat(
        chatDetails.id,
        chatDetails.name,
        chatDetails.notificationsEnabled,
        chatDetails.type
      );
      setMessages(messagesResponse.messages.map(normalizeMessageReplyTo));
    } catch (loadError) {
      const message = loadError instanceof ApiError ? loadError.message : "Не удалось загрузить чат";
      setError(message);
      setChat(null);
      setMessages([]);
    } finally {
      setIsLoading(false);
      setNotificationSessionReady(true);
    }
  }, [chatId, registerChat]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    setReplyToMessages([]);
    setTypingUsers((current) => {
      for (const entry of current.values()) {
        window.clearTimeout(entry.hideTimeoutId);
      }
      return new Map();
    });
  }, [chatId]);

  const showCopyToast = useCallback(() => {
    setIsCopyToastVisible(true);
    if (copyToastTimerRef.current !== null) {
      window.clearTimeout(copyToastTimerRef.current);
    }
    copyToastTimerRef.current = window.setTimeout(() => {
      setIsCopyToastVisible(false);
    }, 1800);
  }, []);

  const removeTypingUser = useCallback((userId: number) => {
    setTypingUsers((current) => {
      const entry = current.get(userId);
      if (entry !== undefined) {
        window.clearTimeout(entry.hideTimeoutId);
      }
      if (!current.has(userId)) {
        return current;
      }
      const next = new Map(current);
      next.delete(userId);
      return next;
    });
  }, []);

  const handleTypingStart = useCallback(() => {
    if (socket === null || !isConnected) {
      return;
    }
    socket.emit("typing:start", { chatId });
  }, [socket, isConnected, chatId]);

  const handleTypingStop = useCallback(() => {
    if (socket === null || !isConnected) {
      return;
    }
    socket.emit("typing:stop", { chatId });
  }, [socket, isConnected, chatId]);

  useEffect(() => {
    if (socket === null || user === null) {
      return;
    }

    const onUserTyping = (payload: UserTypingPayload) => {
      if (payload.chatId !== chatId || payload.userId === user.id) {
        return;
      }

      setTypingUsers((current) => {
        const next = new Map(current);
        const existing = next.get(payload.userId);
        if (existing !== undefined) {
          window.clearTimeout(existing.hideTimeoutId);
        }

        const hideTimeoutId = window.setTimeout(() => {
          removeTypingUser(payload.userId);
        }, 5000);

        next.set(payload.userId, {
          username: payload.username,
          hideTimeoutId,
        });
        return next;
      });
    };

    const onUserTypingStop = (payload: UserTypingStopPayload) => {
      if (payload.chatId !== chatId || payload.userId === user.id) {
        return;
      }
      removeTypingUser(payload.userId);
    };

    socket.on("user:typing", onUserTyping);
    socket.on("user:typing:stop", onUserTypingStop);

    return () => {
      socket.off("user:typing", onUserTyping);
      socket.off("user:typing:stop", onUserTypingStop);
    };
  }, [socket, user, chatId, removeTypingUser]);

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current !== null) {
        window.clearTimeout(copyToastTimerRef.current);
      }
    };
  }, []);

  const typingIndicatorText = useMemo(() => {
    const names = Array.from(typingUsers.values()).map((entry) => entry.username);
    return formatTypingIndicatorText(names);
  }, [typingUsers]);

  useEffect(() => {
    if (partnerId === null) {
      setPartnerStatus(null);
      return;
    }

    void (async () => {
      try {
        const status = await fetchUserStatus(partnerId);
        setPartnerStatus(status);
      } catch {
        setPartnerStatus(null);
      }
    })();
  }, [partnerId]);

  useEffect(() => {
    if (socket === null || partnerId === null) {
      return;
    }

    const handleUserOnline = (payload: UserOnlinePayload) => {
      if (payload.userId !== partnerId) {
        return;
      }

      setPartnerStatus({ isOnline: true, lastSeen: null });
    };

    const handleUserOffline = (payload: UserOfflinePayload) => {
      if (payload.userId !== partnerId) {
        return;
      }

      setPartnerStatus({ isOnline: false, lastSeen: payload.lastSeen });
    };

    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);

    return () => {
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
    };
  }, [socket, partnerId]);

  const getMessageAuthorName = useCallback(
    (message: Message): string => {
      if (user !== null && message.senderId === user.id) {
        return "Вы";
      }
      if (message.senderUsername !== undefined) {
        return message.senderUsername;
      }
      const participant = chat?.participants.find((item) => item.id === message.senderId);
      return participant?.username ?? "Участник";
    },
    [chat, user]
  );

  const handleToggleReply = useCallback((message: Message) => {
    setReplyToMessages((current) => {
      const exists = current.some((item) => item.id === message.id);
      if (exists) {
        return current.filter((item) => item.id !== message.id);
      }
      return [...current, message].sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt)
      );
    });
  }, []);

  const handleRemoveReply = useCallback((messageId: number) => {
    setReplyToMessages((current) => current.filter((item) => item.id !== messageId));
  }, []);

  const handleSend = useCallback(
    async (content: string, replyToMessageIds?: number[]) => {
      if (socket === null || !isConnected) {
        throw new ApiError("Нет соединения с сервером. Подождите...", 503);
      }

      return new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new ApiError("Таймаут отправки сообщения", 408));
        }, 10000);

        const onError = (payload: SocketErrorPayload) => {
          cleanup();
          reject(new ApiError(payload.message, 400));
        };

        const onNew = (payload: SocketMessagePayload) => {
          if (payload.chatId !== chatId) {
            return;
          }
          cleanup();
          resolve();
        };

        const cleanup = () => {
          window.clearTimeout(timeoutId);
          socket.off("error", onError);
          socket.off("message:new", onNew);
        };

        socket.on("error", onError);
        socket.on("message:new", onNew);
        emitChatMessage(socket, chatId, content, replyToMessageIds);
      });
    },
    [socket, isConnected, chatId]
  );

  const handleSendImage = useCallback(
    async (file: File) => {
      const message = await uploadChatImage(chatId, file);
      appendMessage({ ...normalizeMessageReplyTo(message), isRead: true, readByOthers: false });
    },
    [chatId, appendMessage]
  );

  const handleToggleNotifications = async () => {
    if (chat === null) {
      return;
    }

    setActionError(null);
    const nextEnabled = !chat.notificationsEnabled;

    try {
      const result = await updateChatNotificationsApi(chatId, nextEnabled);
      setNotificationsEnabled(chatId, result.notificationsEnabled);
      setChat({ ...chat, notificationsEnabled: result.notificationsEnabled });
    } catch (toggleError) {
      const message =
        toggleError instanceof ApiError
          ? toggleError.message
          : "Не удалось изменить настройки уведомлений";
      setActionError(message);
    }
  };

  const handleDeleteChat = async () => {
    setActionError(null);
    setIsDeleteConfirmOpen(false);
    try {
      await deleteChat(chatId);
      void navigate("/");
    } catch (deleteError) {
      const message =
        deleteError instanceof ApiError ? deleteError.message : "Не удалось удалить чат";
      setActionError(message);
    }
    setIsMenuOpen(false);
  };

  const handleLeaveGroup = async () => {
    setActionError(null);
    try {
      await leaveGroup(chatId);
      void navigate("/");
    } catch (leaveError) {
      const message =
        leaveError instanceof ApiError ? leaveError.message : "Не удалось выйти из группы";
      setActionError(message);
    }
    setIsMenuOpen(false);
  };

  const handleToggleBlock = async () => {
    if (partnerId === null || chat === null) {
      return;
    }

    setActionError(null);
    try {
      if (chat.isBlockedByMe) {
        await unblockUser(partnerId);
        setChat({ ...chat, isBlockedByMe: false });
      } else {
        await blockUser(partnerId);
        setChat({ ...chat, isBlockedByMe: true });
      }
    } catch (blockError) {
      const message =
        blockError instanceof ApiError ? blockError.message : "Не удалось изменить блокировку";
      setActionError(message);
    }
    setIsMenuOpen(false);
  };

  const isBlockedByPartner = chat?.isBlockedByPartner === true;
  const composerDisabled =
    isLoading || chat === null || !isConnected || isBlockedByPartner;

  if (error !== null) {
    return (
      <main className="page chat-page">
        <p className="form-error">{error}</p>
        <Link to="/" className="back-link">
          ← К чатам
        </Link>
      </main>
    );
  }

  return (
    <main className="chat-page">
      <CopyToast isVisible={isCopyToastVisible} />
      <header className="chat-window-header">
        <Link to="/" className="back-link" aria-label="Назад к списку чатов">
          ←
        </Link>
        <div className="chat-avatar" aria-hidden="true">
          {getInitials(chat?.name ?? "?")}
        </div>
        <div className="chat-window-title">
          <h1>{chat?.name ?? "Чат"}</h1>
          {chat?.type === "private" && (
            <p
              className={
                partnerStatus?.isOnline === true
                  ? "chat-window-status chat-window-status--online"
                  : "chat-window-status"
              }
            >
              {partnerStatus === null
                ? "Загрузка..."
                : formatPresenceStatus(partnerStatus.isOnline, partnerStatus.lastSeen)}
            </p>
          )}
          {chat?.type === "group" && (
            <button
              type="button"
              className="link-button chat-members-link"
              onClick={() => {
                setIsMembersOpen(true);
              }}
            >
              {String(chat.participants.length)} участник(ов)
            </button>
          )}
        </div>
        <div className="chat-header-actions">
          <button
            type="button"
            className="icon-button notification-toggle"
            aria-label={
              chat?.notificationsEnabled === true
                ? "Отключить уведомления для этого чата"
                : "Включить уведомления для этого чата"
            }
            title={
              chat?.notificationsEnabled === true
                ? "Уведомления включены"
                : "Уведомления отключены"
            }
            disabled={chat === null || isLoading}
            onClick={() => {
              void handleToggleNotifications();
            }}
          >
            {chat?.notificationsEnabled === true ? "🔔" : "🔕"}
          </button>
          <div className="chat-menu">
          <button
            type="button"
            className="icon-button"
            aria-label="Действия"
            onClick={() => {
              setIsMenuOpen((value) => !value);
            }}
          >
            ⋮
          </button>
          {isMenuOpen && (
            <div className="chat-menu-dropdown">
              {chat?.type === "group" && (
                <>
                  <button
                    type="button"
                    className="chat-menu-item"
                    onClick={() => {
                      setIsMembersOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    Участники
                  </button>
                  <button type="button" className="chat-menu-item" onClick={() => void handleLeaveGroup()}>
                    Выйти из группы
                  </button>
                </>
              )}
              {chat?.type === "private" && partnerId !== null && (
                <button type="button" className="chat-menu-item" onClick={() => void handleToggleBlock()}>
                  {chat.isBlockedByMe ? "Разблокировать" : "Заблокировать"}
                </button>
              )}
              <button
                type="button"
                className="chat-menu-item chat-menu-item-danger"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsDeleteConfirmOpen(true);
                }}
              >
                Удалить чат
              </button>
            </div>
          )}
          </div>
        </div>
      </header>

      <div className="chat-page-body">
        {actionError !== null && <p className="chat-action-error">{actionError}</p>}

        {isBlockedByPartner && (
          <div className="blocked-banner" role="alert">
            Вас добавили в чёрный список. Вы не можете отправлять сообщения в этом чате.
          </div>
        )}

        <MessageList
          chatId={chatId}
          messages={messages}
          currentUserId={user?.id ?? 0}
          isLoading={isLoading}
          isGroup={chat?.type === "group"}
          selectedReplyIds={selectedReplyIds}
          onToggleReply={composerDisabled ? undefined : handleToggleReply}
          onInitialScrollComplete={handleInitialScrollComplete}
          onMessageCopied={showCopyToast}
        />

        <TypingIndicator text={typingIndicatorText} />

        <MessageComposer
          disabled={composerDisabled}
          replyToMessages={replyToMessages}
          getAuthorName={getMessageAuthorName}
          onRemoveReply={handleRemoveReply}
          onCancelAllReplies={() => {
            setReplyToMessages([]);
          }}
          onSend={handleSend}
          onSendImage={composerDisabled ? undefined : handleSendImage}
          onTypingStart={composerDisabled ? undefined : handleTypingStart}
          onTypingStop={composerDisabled ? undefined : handleTypingStop}
        />
      </div>

      <GroupMembersModal
        isOpen={isMembersOpen}
        chatId={chat?.type === "group" ? chatId : undefined}
        members={chat?.participants ?? []}
        onClose={() => {
          setIsMembersOpen(false);
        }}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Удалить чат?"
        message={
          chat?.type === "group"
            ? "Чат будет удален только у вас. История сообщений сохранится для остальных участников."
            : "Чат будет удален только у вас. Если собеседник напишет снова, чат восстановится без старых сообщений."
        }
        confirmLabel="Удалить"
        onConfirm={() => {
          void handleDeleteChat();
        }}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
        }}
      />
    </main>
  );
}
