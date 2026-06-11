export type ReplyPreview = {
  id: number;
  senderId: number;
  senderUsername: string;
  content: string | null;
  imageUrl: string | null;
};

export type MessageDto = {
  id: number;
  senderId: number;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  senderUsername?: string;
  replyTo?: ReplyPreview[];
  isRead: boolean;
  readByOthers: boolean;
};

export type MessagesPage = {
  messages: MessageDto[];
  hasMore: boolean;
};

export type ChatDetails = {
  id: number;
  type: "private" | "group";
  name: string;
  participants: Array<{ id: number; username: string }>;
  isBlockedByMe: boolean;
  isBlockedByPartner: boolean;
  notificationsEnabled: boolean;
};
