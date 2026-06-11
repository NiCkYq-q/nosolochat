import type { Server } from "socket.io";
import { getChatDisplayName, getMessageCutoff, PRESENT_MEMBER_WHERE } from "../lib/chat-access.js";
import { prisma } from "../lib/prisma.js";
import type { RestoredChatInfo } from "../services/chat.service.js";
import type { InviteDto } from "../services/invite.service.js";
import type { MessageDto } from "../types/message.js";

export type SocketMessagePayload = MessageDto & {
  chatId: number;
  chatType?: "private" | "group";
  chatName?: string;
};

export async function getUnreadCount(chatId: number, userId: number): Promise<number> {
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    select: { messagesVisibleFrom: true },
  });

  const cutoff = getMessageCutoff(membership?.messagesVisibleFrom ?? null);

  return prisma.messageRead.count({
    where: {
      userId,
      readAt: null,
      message: {
        chatId,
        ...(cutoff !== null ? { createdAt: { gte: cutoff } } : {}),
      },
    },
  });
}

export function emitChatRestored(
  io: Server,
  restored: RestoredChatInfo,
  lastMessage: { content: string | null; imageUrl?: string | null; createdAt: string }
): void {
  const preview =
    lastMessage.content ?? (lastMessage.imageUrl !== null && lastMessage.imageUrl !== undefined ? "Фото" : null);

  io.to(`user:${String(restored.userId)}`).emit("chat:created", {
    id: restored.chatId,
    type: restored.type,
    name: restored.name,
    lastMessage: preview,
    lastMessageAt: lastMessage.createdAt,
  });
}

export async function emitMessageToChatMembers(
  io: Server,
  message: SocketMessagePayload,
  restoredChats: RestoredChatInfo[] = []
): Promise<void> {
  for (const restored of restoredChats) {
    emitChatRestored(io, restored, {
      content: message.content,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt,
    });
  }

  const members = await prisma.chatMember.findMany({
    where: { chatId: message.chatId, ...PRESENT_MEMBER_WHERE },
    select: { userId: true, deletedAt: true },
  });

  const chat = await prisma.chat.findUnique({
    where: { id: message.chatId },
    include: {
      members: {
        where: PRESENT_MEMBER_WHERE,
        include: { user: { select: { id: true, username: true } } },
      },
    },
  });

  if (chat === null) {
    return;
  }

  for (const member of members) {
    if (member.deletedAt !== null) {
      continue;
    }

    io.to(`user:${String(member.userId)}`).emit("message:new", {
      ...message,
      chatType: chat.type,
      chatName: getChatDisplayName(chat, member.userId),
    });

    const unreadCount = await getUnreadCount(message.chatId, member.userId);
    io.to(`user:${String(member.userId)}`).emit("chat:unread-updated", {
      chatId: message.chatId,
      unreadCount,
    });
  }
}

export function emitGroupCreatedForUser(
  io: Server,
  userId: number,
  chat: { id: number; name: string }
): void {
  io.to(`user:${String(userId)}`).emit("group:created", {
    id: chat.id,
    name: chat.name,
  });
  io.to(`user:${String(userId)}`).emit("chat:created", {
    id: chat.id,
    type: "group",
    name: chat.name,
  });
}

export async function emitUnreadUpdate(
  io: Server,
  chatId: number,
  userId: number
): Promise<void> {
  const unreadCount = await getUnreadCount(chatId, userId);
  io.to(`user:${String(userId)}`).emit("chat:unread-updated", {
    chatId,
    unreadCount,
  });
}

export async function emitMessageRead(
  io: Server,
  chatId: number,
  readerUserId: number,
  messageIds: number[]
): Promise<void> {
  if (messageIds.length === 0) {
    return;
  }

  const members = await prisma.chatMember.findMany({
    where: { chatId, ...PRESENT_MEMBER_WHERE },
    select: { userId: true },
  });

  const payload = {
    chatId,
    messageIds,
    userId: readerUserId,
  };

  for (const member of members) {
    io.to(`user:${String(member.userId)}`).emit("message:read", payload);
  }
}

export function emitPrivateChatRequest(
  io: Server,
  toUserId: number,
  payload: {
    inviteId: number;
    fromUserId: number;
    fromUsername: string;
  }
): void {
  io.to(`user:${String(toUserId)}`).emit("chat:request", payload);
}

export function emitPrivateChatAccepted(
  io: Server,
  toUserId: number,
  payload: { chatId: number; acceptedByUsername: string }
): void {
  io.to(`user:${String(toUserId)}`).emit("chat:request-accepted", payload);
}

export function emitPrivateChatRejected(
  io: Server,
  toUserId: number,
  payload: { rejectedByUsername: string }
): void {
  io.to(`user:${String(toUserId)}`).emit("chat:request-rejected", payload);
}

export function emitGroupInvite(
  io: Server,
  toUserId: number,
  payload: {
    inviteId: number;
    chatId: number;
    groupName: string;
    fromUserId: number;
    fromUsername: string;
  }
): void {
  io.to(`user:${String(toUserId)}`).emit("group:invite", payload);
}

export function emitGroupInviteRejected(
  io: Server,
  toUserId: number,
  payload: { rejectedByUsername: string; groupName: string }
): void {
  io.to(`user:${String(toUserId)}`).emit("group:invite-rejected", payload);
}

export function emitInviteNotification(io: Server, userId: number, invite: InviteDto): void {
  if (invite.type === "private") {
    emitPrivateChatRequest(io, userId, {
      inviteId: invite.id,
      fromUserId: invite.fromUserId,
      fromUsername: invite.fromUsername,
    });
    return;
  }

  if (invite.chatId !== null && invite.groupName !== null) {
    emitGroupInvite(io, userId, {
      inviteId: invite.id,
      chatId: invite.chatId,
      groupName: invite.groupName,
      fromUserId: invite.fromUserId,
      fromUsername: invite.fromUsername,
    });
  }
}
