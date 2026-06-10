import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useChatNotifications } from "../context/useChatNotifications";
import { useSocket } from "../context/useSocket";
import type {
  ChatRequestAcceptedPayload,
  ChatRequestRejectedPayload,
  GroupInviteRejectedPayload,
  SocketMessagePayload,
} from "../socket/events";
import { formatMessageNotificationText } from "../utils/formatMessageNotification";
import { playNotificationSound } from "../utils/notificationSound";

type Toast = {
  id: number;
  message: string;
  chatId?: number;
};

export default function ToastNotifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { isNotificationsEnabled, getChatName, getChatType } = useChatNotifications();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (socket === null) {
      return;
    }

    const addToast = (toast: Omit<Toast, "id">) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, ...toast }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, 5000);
    };

    const onAccepted = (payload: ChatRequestAcceptedPayload) => {
      addToast({ message: `${payload.acceptedByUsername} принял(а) ваш запрос на диалог` });
    };

    const onRejected = (payload: ChatRequestRejectedPayload) => {
      addToast({ message: `${payload.rejectedByUsername} отклонил(а) ваш запрос на диалог` });
    };

    const onGroupRejected = (payload: GroupInviteRejectedPayload) => {
      addToast({
        message: `${payload.rejectedByUsername} отклонил(а) приглашение в группу ${payload.groupName}`,
      });
    };

    const onNewMessage = (payload: SocketMessagePayload) => {
      if (user === null || payload.senderId === user.id) {
        return;
      }

      const openChatMatch = /^\/chats\/(\d+)$/.exec(location.pathname);
      const openChatId =
        openChatMatch !== null ? Number.parseInt(openChatMatch[1], 10) : null;

      if (openChatId === payload.chatId) {
        return;
      }

      if (!isNotificationsEnabled(payload.chatId)) {
        return;
      }

      playNotificationSound();

      addToast({
        message: formatMessageNotificationText(
          payload,
          getChatName(payload.chatId),
          getChatType(payload.chatId)
        ),
        chatId: payload.chatId,
      });
    };

    socket.on("chat:request-accepted", onAccepted);
    socket.on("chat:request-rejected", onRejected);
    socket.on("group:invite-rejected", onGroupRejected);
    socket.on("message:new", onNewMessage);

    return () => {
      socket.off("chat:request-accepted", onAccepted);
      socket.off("chat:request-rejected", onRejected);
      socket.off("group:invite-rejected", onGroupRejected);
      socket.off("message:new", onNewMessage);
    };
  }, [socket, user, location.pathname, isNotificationsEnabled, getChatName, getChatType]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`toast ${toast.chatId !== undefined ? "toast-clickable" : ""}`}
          onClick={() => {
            if (toast.chatId !== undefined) {
              void navigate(`/chats/${String(toast.chatId)}`);
            }
          }}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
