import { useEffect } from "react";
import type { ChatListItem } from "../api/chats";
import { getMessagePreview } from "../api/messages";
import { useSocket } from "../context/useSocket";
import type {
  ChatCreatedPayload,
  ChatUnreadUpdatedPayload,
  SocketMessagePayload,
} from "../socket/events";

function sortChats(chats: ChatListItem[]): ChatListItem[] {
  return [...chats].sort((left, right) => {
    const leftTime = left.lastMessageAt ?? "";
    const rightTime = right.lastMessageAt ?? "";
    return rightTime.localeCompare(leftTime);
  });
}

type UseChatListSocketOptions = {
  onUpdate: (updater: (chats: ChatListItem[]) => ChatListItem[]) => void;
  onPresenceChange?: () => void;
};

export function useChatListSocket({ onUpdate, onPresenceChange }: UseChatListSocketOptions): void {
  const { socket } = useSocket();

  useEffect(() => {
    if (socket === null) {
      return;
    }

    const handleNewMessage = (payload: SocketMessagePayload) => {
      onUpdate((chats) =>
        sortChats(
          chats.map((chat) =>
            chat.id === payload.chatId
              ? {
                  ...chat,
                  lastMessage: getMessagePreview(payload),
                  lastMessageAt: payload.createdAt,
                }
              : chat
          )
        )
      );
    };

    const handleUnreadUpdated = (payload: ChatUnreadUpdatedPayload) => {
      onUpdate((chats) =>
        chats.map((chat) =>
          chat.id === payload.chatId ? { ...chat, unreadCount: payload.unreadCount } : chat
        )
      );
    };

    const handleChatCreated = (payload: ChatCreatedPayload) => {
      onUpdate((chats) => {
        if (chats.some((chat) => chat.id === payload.id)) {
          return sortChats(
            chats.map((chat) =>
              chat.id === payload.id
                ? {
                    ...chat,
                    name: payload.name,
                    lastMessage: payload.lastMessage ?? chat.lastMessage,
                    lastMessageAt: payload.lastMessageAt ?? chat.lastMessageAt,
                  }
                : chat
            )
          );
        }

        const newChat: ChatListItem = {
          id: payload.id,
          type: payload.type,
          name: payload.name,
          lastMessage: payload.lastMessage ?? null,
          lastMessageAt: payload.lastMessageAt ?? null,
          unreadCount: payload.lastMessage === undefined ? 0 : 1,
          isOnline: false,
          notificationsEnabled: true,
        };

        return sortChats([newChat, ...chats]);
      });
    };

    const handleUserOnline = () => {
      onPresenceChange?.();
    };

    const handleUserOffline = () => {
      onPresenceChange?.();
    };

    socket.on("message:new", handleNewMessage);
    socket.on("chat:unread-updated", handleUnreadUpdated);
    const handleRequestAccepted = () => {
      onPresenceChange?.();
    };

    socket.on("chat:created", handleChatCreated);
    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);
    socket.on("chat:request-accepted", handleRequestAccepted);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("chat:unread-updated", handleUnreadUpdated);
      socket.off("chat:created", handleChatCreated);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
      socket.off("chat:request-accepted", handleRequestAccepted);
    };
  }, [socket, onUpdate, onPresenceChange]);
}
