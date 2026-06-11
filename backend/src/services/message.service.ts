import { ChatType } from "@prisma/client";
import { getChatDisplayName, getMessageCutoff, requireChatMember } from "../lib/chat-access.js";
import { validateMessageContent } from "../lib/message-validation.js";
import { prisma } from "../lib/prisma.js";
import { getBlockStatus, isBlocked } from "./block.service.js";
import { restoreHiddenChatsForNewMessage, type RestoredChatInfo } from "./chat.service.js";
import type { ChatDetails, MessageDto, MessagesPage, ReplyPreview } from "../types/message.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;
const MAX_REPLY_TARGETS = 10;

const messageSelect = {
  id: true,
  senderId: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  sender: { select: { username: true } },
  replyTargets: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      target: {
        select: {
          id: true,
          senderId: true,
          content: true,
          imageUrl: true,
          sender: { select: { username: true } },
        },
      },
    },
  },
} as const;

type ReplyTargetRow = {
  target: {
    id: number;
    senderId: number;
    content: string | null;
    imageUrl: string | null;
    sender: { username: string };
  };
};

type MessageRow = {
  id: number;
  senderId: number;
  content: string | null;
  imageUrl: string | null;
  createdAt: Date;
  sender: { username: string };
  replyTargets: ReplyTargetRow[];
};

function mapReplyPreview(target: ReplyTargetRow["target"]): ReplyPreview {
  return {
    id: target.id,
    senderId: target.senderId,
    senderUsername: target.sender.username,
    content: target.content,
    imageUrl: target.imageUrl,
  };
}

function mapMessageToDto(
  message: MessageRow,
  isGroup: boolean,
  isRead: boolean,
  readByOthers: boolean
): MessageDto {
  return {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt.toISOString(),
    senderUsername: isGroup ? message.sender.username : undefined,
    replyTo: message.replyTargets.map((entry) => mapReplyPreview(entry.target)),
    isRead,
    readByOthers,
  };
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function parseMessagesQuery(query: {
  page?: unknown;
  limit?: unknown;
}): { page: number; limit: number } {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const rawLimit = parsePositiveInt(query.limit, DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, MAX_LIMIT);

  return { page, limit };
}

function parseReplyToMessageIds(
  replyToMessageIds: unknown,
  replyToMessageId: unknown
): number[] | { error: string; status: number } {
  let rawIds: unknown[] = [];

  if (replyToMessageIds !== undefined && replyToMessageIds !== null) {
    if (!Array.isArray(replyToMessageIds)) {
      return { error: "replyToMessageIds must be an array", status: 400 };
    }
    rawIds = replyToMessageIds;
  } else if (replyToMessageId !== undefined && replyToMessageId !== null) {
    rawIds = [replyToMessageId];
  }

  for (const id of rawIds) {
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      return { error: "Valid replyToMessageIds are required", status: 400 };
    }
  }

  const ids = [...new Set(rawIds as number[])];

  if (ids.length > MAX_REPLY_TARGETS) {
    return {
      error: `Cannot reply to more than ${String(MAX_REPLY_TARGETS)} messages`,
      status: 400,
    };
  }

  return ids;
}

async function validateReplyTargets(
  chatId: number,
  replyToMessageIds: number[],
  messagesVisibleFrom: Date | null
): Promise<{ ok: true; previews: ReplyPreview[] } | { error: string; status: number }> {
  const previews: ReplyPreview[] = [];

  for (const targetId of replyToMessageIds) {
    const cutoff = getMessageCutoff(messagesVisibleFrom);

    const original = await prisma.message.findFirst({
      where: {
        id: targetId,
        chatId,
        ...(cutoff !== null ? { createdAt: { gte: cutoff } } : {}),
      },
      select: {
        id: true,
        senderId: true,
        content: true,
        imageUrl: true,
        sender: { select: { username: true } },
      },
    });

    if (original === null) {
      return { error: "Reply target message not found", status: 404 };
    }

    previews.push(mapReplyPreview(original));
  }

  return { ok: true, previews };
}

export async function getChatDetails(
  chatId: number,
  userId: number
): Promise<ChatDetails | { error: string; status: number }> {
  const membership = await requireChatMember(chatId, userId);
  if (membership === null) {
    return { error: "Chat not found", status: 404 };
  }

  const chat = membership.chat;
  const partner =
    chat.type === ChatType.private
      ? chat.members.find((member) => member.userId !== userId)
      : undefined;

  let blockStatus = {
    isBlockedByMe: false,
    isBlockedByPartner: false,
  };

  if (partner !== undefined) {
    blockStatus = await getBlockStatus(userId, partner.userId);
  }

  return {
    id: chat.id,
    type: chat.type,
    name: getChatDisplayName(chat, userId),
    participants: chat.members.map((member) => ({
      id: member.user.id,
      username: member.user.username,
    })),
    isBlockedByMe: blockStatus.isBlockedByMe,
    isBlockedByPartner: blockStatus.isBlockedByPartner,
    notificationsEnabled: membership.notificationsEnabled,
  };
}

export async function getMessages(
  chatId: number,
  userId: number,
  page: number,
  limit: number
): Promise<MessagesPage | { error: string; status: number }> {
  const membership = await requireChatMember(chatId, userId);
  if (membership === null) {
    return { error: "Chat not found", status: 404 };
  }

  const isGroup = membership.chat.type === ChatType.group;
  const cutoff = getMessageCutoff(membership.messagesVisibleFrom);

  const skip = (page - 1) * limit;
  const rows = await prisma.message.findMany({
    where: {
      chatId,
      ...(cutoff !== null ? { createdAt: { gte: cutoff } } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit + 1,
    select: messageSelect,
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const chronologicalRows = pageRows.reverse();

  const readRows = await prisma.messageRead.findMany({
    where: {
      userId,
      messageId: { in: chronologicalRows.map((message) => message.id) },
    },
    select: { messageId: true, readAt: true },
  });

  const readAtByMessageId = new Map(
    readRows.map((read) => [read.messageId, read.readAt])
  );

  const ownMessageIds = chronologicalRows
    .filter((message) => message.senderId === userId)
    .map((message) => message.id);

  const readByOthersRows =
    ownMessageIds.length === 0
      ? []
      : await prisma.messageRead.findMany({
          where: {
            messageId: { in: ownMessageIds },
            userId: { not: userId },
            readAt: { not: null },
          },
          select: { messageId: true },
          distinct: ["messageId"],
        });

  const readByOthersSet = new Set(readByOthersRows.map((read) => read.messageId));

  const messages: MessageDto[] = chronologicalRows.map((message) => {
    const isOwnMessage = message.senderId === userId;
    const readAt = readAtByMessageId.get(message.id);
    const isRead = isOwnMessage || (readAt !== null && readAt !== undefined);
    const readByOthers = isOwnMessage ? readByOthersSet.has(message.id) : false;

    return mapMessageToDto(message, isGroup, isRead, readByOthers);
  });

  return { messages, hasMore };
}

export type SendMessageResult = {
  message: MessageDto;
  restoredChats: RestoredChatInfo[];
};

export async function sendMessage(
  chatId: number,
  senderId: number,
  content: unknown,
  replyToMessageIds?: unknown,
  replyToMessageId?: unknown
): Promise<SendMessageResult | { error: string; status: number }> {
  const validation = validateMessageContent(content);
  if (!validation.ok) {
    return { error: validation.message, status: 400 };
  }

  const membership = await requireChatMember(chatId, senderId);
  if (membership === null) {
    return { error: "Chat not found", status: 404 };
  }

  const chat = membership.chat;

  if (chat.type === ChatType.private) {
    const partner = chat.members.find((member) => member.userId !== senderId);
    if (partner !== undefined && (await isBlocked(partner.userId, senderId))) {
      return { error: "Вас добавили в чёрный список", status: 403 };
    }
  }

  const parsedIds = parseReplyToMessageIds(replyToMessageIds, replyToMessageId);
  if (!Array.isArray(parsedIds)) {
    return parsedIds;
  }

  let replyPreviews: ReplyPreview[] = [];

  if (parsedIds.length > 0) {
    const replyValidation = await validateReplyTargets(
      chatId,
      parsedIds,
      membership.messagesVisibleFrom
    );

    if ("error" in replyValidation) {
      return replyValidation;
    }

    replyPreviews = replyValidation.previews;
  }

  const now = new Date();
  const members = chat.members;

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId,
      content: validation.content,
      replyTargets:
        replyPreviews.length > 0
          ? {
              create: replyPreviews.map((preview, index) => ({
                targetMessageId: preview.id,
                sortOrder: index,
              })),
            }
          : undefined,
      reads: {
        create: members.map((member) => ({
          userId: member.userId,
          readAt: member.userId === senderId ? now : null,
        })),
      },
    },
    select: messageSelect,
  });

  const restoredChats = await restoreHiddenChatsForNewMessage(chatId, senderId);

  return {
    message: mapMessageToDto(message, chat.type === ChatType.group, true, false),
    restoredChats,
  };
}

export async function markChatAsRead(
  chatId: number,
  userId: number
): Promise<{ ok: true; messageIds: number[] } | { error: string; status: number }> {
  const membership = await requireChatMember(chatId, userId);
  if (membership === null) {
    return { error: "Chat not found", status: 404 };
  }

  const cutoff = getMessageCutoff(membership.messagesVisibleFrom);
  const now = new Date();

  const unreadReads = await prisma.messageRead.findMany({
    where: {
      userId,
      readAt: null,
      message: {
        chatId,
        ...(cutoff !== null ? { createdAt: { gte: cutoff } } : {}),
      },
    },
    select: { messageId: true },
  });

  const messageIds = unreadReads.map((read) => read.messageId);

  if (messageIds.length === 0) {
    return { ok: true, messageIds: [] };
  }

  await prisma.messageRead.updateMany({
    where: {
      userId,
      messageId: { in: messageIds },
      readAt: null,
    },
    data: { readAt: now },
  });

  return { ok: true, messageIds };
}
