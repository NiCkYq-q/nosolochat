import { apiRequest } from "./client";

export type ReplyPreview = {
  id: number;
  senderId: number;
  senderUsername: string;
  content: string | null;
  imageUrl: string | null;
};

export type Message = {
  id: number;
  senderId: number;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  senderUsername?: string;
  replyTo?: ReplyPreview[];
};

export type MessagesResponse = {
  messages: Message[];
  hasMore: boolean;
};

export async function fetchMessages(chatId: number): Promise<MessagesResponse> {
  const params = new URLSearchParams({ page: "1", limit: "50" });
  return apiRequest<MessagesResponse>(`/api/chats/${String(chatId)}/messages?${params.toString()}`);
}

export async function sendMessage(
  chatId: number,
  content: string,
  replyToMessageIds?: number[]
): Promise<Message> {
  return apiRequest<Message>(`/api/chats/${String(chatId)}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      ...(replyToMessageIds !== undefined && replyToMessageIds.length > 0
        ? { replyToMessageIds }
        : {}),
    }),
  });
}

export async function uploadChatImage(chatId: number, file: File): Promise<Message> {
  const formData = new FormData();
  formData.append("image", file);

  return apiRequest<Message>(`/api/chats/${String(chatId)}/upload`, {
    method: "POST",
    body: formData,
  });
}

export function getMessagePreview(message: Pick<Message, "content" | "imageUrl">): string | null {
  if (message.content !== null && message.content !== "") {
    return message.content;
  }
  if (message.imageUrl !== null) {
    return "Фото";
  }
  return null;
}

export function getReplyPreviewText(
  replyTo: Pick<ReplyPreview, "content" | "imageUrl">,
  maxLength = 80
): string {
  if (replyTo.content !== null && replyTo.content !== "") {
    const text = replyTo.content;
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }
  if (replyTo.imageUrl !== null) {
    return "Фото";
  }
  return "Сообщение";
}

export function normalizeMessageReplyTo(
  message: Message & { replyTo?: ReplyPreview[] | ReplyPreview | null }
): Message {
  if (message.replyTo === undefined || message.replyTo === null) {
    return { ...message, replyTo: [] };
  }
  if (Array.isArray(message.replyTo)) {
    return message;
  }
  return { ...message, replyTo: [message.replyTo] };
}
