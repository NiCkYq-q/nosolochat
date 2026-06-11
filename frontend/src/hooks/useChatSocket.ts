import { useEffect } from "react";
import { markChatAsRead } from "../api/chats";
import { normalizeMessageReplyTo, type Message } from "../api/messages";
import { useSocket } from "../context/useSocket";
import type { MessageReadPayload, SocketMessagePayload } from "../socket/events";

type UseChatSocketOptions = {
  chatId: number;
  currentUserId: number;
  onMessage: (message: Message) => void;
  onMessagesRead?: (payload: { chatId: number; messageIds: number[]; userId: number }) => void;
};

export function useChatSocket({
  chatId,
  currentUserId,
  onMessage,
  onMessagesRead,
}: UseChatSocketOptions): void {
  const { socket } = useSocket();

  useEffect(() => {
    if (socket === null) {
      return;
    }

    const handleNewMessage = (payload: SocketMessagePayload) => {
      if (payload.chatId !== chatId) {
        return;
      }

      onMessage(
        normalizeMessageReplyTo({
          id: payload.id,
          senderId: payload.senderId,
          content: payload.content,
          imageUrl: payload.imageUrl,
          createdAt: payload.createdAt,
          senderUsername: payload.senderUsername,
          replyTo: payload.replyTo,
          isRead: payload.senderId === currentUserId,
          readByOthers: false,
        })
      );

      if (payload.senderId !== currentUserId) {
        void markChatAsRead(chatId);
      }
    };

    const handleMessagesRead = (payload: MessageReadPayload) => {
      if (payload.chatId !== chatId) {
        return;
      }

      onMessagesRead?.(payload);
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:read", handleMessagesRead);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:read", handleMessagesRead);
    };
  }, [socket, chatId, currentUserId, onMessage, onMessagesRead]);
}

export function emitChatMessage(
  socket: NonNullable<ReturnType<typeof useSocket>["socket"]>,
  chatId: number,
  content: string,
  replyToMessageIds?: number[]
): void {
  socket.emit("message:send", {
    chatId,
    content,
    ...(replyToMessageIds !== undefined && replyToMessageIds.length > 0
      ? { replyToMessageIds }
      : {}),
  });
}
