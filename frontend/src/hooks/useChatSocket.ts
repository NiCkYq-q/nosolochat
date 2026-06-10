import { useEffect } from "react";
import { markChatAsRead } from "../api/chats";
import { normalizeMessageReplyTo, type Message } from "../api/messages";
import { useSocket } from "../context/useSocket";
import type { SocketMessagePayload } from "../socket/events";

type UseChatSocketOptions = {
  chatId: number;
  currentUserId: number;
  onMessage: (message: Message) => void;
};

export function useChatSocket({ chatId, currentUserId, onMessage }: UseChatSocketOptions): void {
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
        })
      );

      if (payload.senderId !== currentUserId) {
        void markChatAsRead(chatId);
      }
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, chatId, currentUserId, onMessage]);
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
