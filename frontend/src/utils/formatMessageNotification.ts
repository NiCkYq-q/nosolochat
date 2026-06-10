import { getMessagePreview } from "../api/messages";
import type { SocketMessagePayload } from "../socket/events";

export function formatMessageNotificationText(
  payload: SocketMessagePayload,
  fallbackChatName: string | null,
  fallbackChatType: "private" | "group" | null
): string {
  const preview = getMessagePreview(payload) ?? "Новое сообщение";
  const chatType = payload.chatType ?? fallbackChatType;
  const chatName = payload.chatName ?? fallbackChatName ?? "Чат";

  if (chatType === "group") {
    const sender = payload.senderUsername ?? "Участник";
    return `${chatName} — ${sender}: ${preview}`;
  }

  return `${chatName}: ${preview}`;
}
