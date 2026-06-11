import type { Message } from "../api/messages";
import type { Invite } from "../api/invites";

export type SocketMessagePayload = Message & {
  chatId: number;
  chatType?: "private" | "group";
  chatName?: string;
};

export type MessageReadPayload = {
  chatId: number;
  messageIds: number[];
  userId: number;
};

export type UserTypingPayload = {
  chatId: number;
  userId: number;
  username: string;
};

export type UserTypingStopPayload = {
  chatId: number;
  userId: number;
};

export type ChatUnreadUpdatedPayload = {
  chatId: number;
  unreadCount: number;
};

export type SocketErrorPayload = {
  message: string;
};

export type AuthenticatedPayload = {
  userId: number;
};

export type ChatCreatedPayload = {
  id: number;
  type: "private" | "group";
  name: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
};

export type UserOnlinePayload = {
  userId: number;
};

export type UserOfflinePayload = {
  userId: number;
  lastSeen: string;
};

export type ChatRequestPayload = {
  inviteId: number;
  fromUserId: number;
  fromUsername: string;
};

export type ChatRequestAcceptedPayload = {
  chatId: number;
  acceptedByUsername: string;
};

export type ChatRequestRejectedPayload = {
  rejectedByUsername: string;
};

export type GroupInvitePayload = {
  inviteId: number;
  chatId: number;
  groupName: string;
  fromUserId: number;
  fromUsername: string;
};

export type GroupInviteRejectedPayload = {
  rejectedByUsername: string;
  groupName: string;
};

export type InvitePayload = Invite;
