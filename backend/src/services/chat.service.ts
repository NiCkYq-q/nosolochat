import { ChatType } from "@prisma/client";
import {
  ACTIVE_MEMBER_WHERE,
  getChatDisplayName,
  getMessageCutoff,
  PRESENT_MEMBER_WHERE,
} from "../lib/chat-access.js";
import { prisma } from "../lib/prisma.js";
import { isUserOnline } from "./presence.service.js";
import type { ChatListItem } from "../types/chat.js";

function buildUnreadCountMap(
  unreadReads: Array<{ message: { chatId: number } }>
): Map<number, number> {
  const unreadMap = new Map<number, number>();

  for (const read of unreadReads) {
    const chatId = read.message.chatId;
    unreadMap.set(chatId, (unreadMap.get(chatId) ?? 0) + 1);
  }

  return unreadMap;
}

export async function getChatsForUser(userId: number): Promise<ChatListItem[]> {
  const memberships = await prisma.chatMember.findMany({
    where: {
      userId,
      ...ACTIVE_MEMBER_WHERE,
    },
    include: {
      chat: {
        include: {
          members: {
            where: PRESENT_MEMBER_WHERE,
            include: {
              user: { select: { id: true, username: true } },
            },
          },
        },
      },
    },
  });

  const chatIds = memberships.map((membership) => membership.chat.id);

  const unreadReads =
    chatIds.length === 0
      ? []
      : await prisma.messageRead.findMany({
          where: {
            userId,
            readAt: null,
            message: { chatId: { in: chatIds } },
          },
          select: {
            message: { select: { chatId: true, createdAt: true } },
          },
        });

  const membershipByChatId = new Map(memberships.map((m) => [m.chat.id, m]));

  const filteredUnreadReads = unreadReads.filter((read) => {
    const membership = membershipByChatId.get(read.message.chatId);
    if (membership === undefined) {
      return false;
    }
    const cutoff = getMessageCutoff(membership.messagesVisibleFrom);
    if (cutoff === null) {
      return true;
    }
    return read.message.createdAt >= cutoff;
  });

  const unreadMap = buildUnreadCountMap(filteredUnreadReads);

  const items = await Promise.all(
    memberships.map(async (membership) => {
      const chat = membership.chat;
      const cutoff = getMessageCutoff(membership.messagesVisibleFrom);

      const lastMessage = await prisma.message.findFirst({
        where: {
          chatId: chat.id,
          ...(cutoff !== null ? { createdAt: { gte: cutoff } } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: { content: true, imageUrl: true, createdAt: true },
      });

      const lastMessagePreview =
        lastMessage === null
          ? null
          : lastMessage.content ?? (lastMessage.imageUrl !== null ? "Фото" : null);

      const lastMessageAt =
        lastMessage === null ? null : lastMessage.createdAt.toISOString();
      const unreadCount = unreadMap.get(chat.id);

      let partnerIsOnline = false;
      if (chat.type === ChatType.private) {
        const partner = chat.members.find((member) => member.userId !== userId);
        if (partner !== undefined) {
          partnerIsOnline = isUserOnline(partner.userId);
        }
      }

      return {
        item: {
          id: chat.id,
          type: chat.type,
          name: getChatDisplayName(chat, userId),
          lastMessage: lastMessagePreview,
          lastMessageAt,
          unreadCount: unreadCount === undefined ? 0 : unreadCount,
          isOnline: partnerIsOnline,
          notificationsEnabled: membership.notificationsEnabled,
        } satisfies ChatListItem,
        sortAt: lastMessageAt === null ? chat.createdAt.toISOString() : lastMessageAt,
      };
    })
  );

  items.sort((left, right) => right.sortAt.localeCompare(left.sortAt));

  return items.map((entry) => entry.item);
}

async function purgeChatMessages(chatId: number): Promise<void> {
  await prisma.message.deleteMany({ where: { chatId } });
}

export async function deleteChatForUser(
  chatId: number,
  userId: number
): Promise<{ ok: true } | { error: string; status: number }> {
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    include: {
      chat: {
        include: {
          members: {
            where: PRESENT_MEMBER_WHERE,
          },
        },
      },
    },
  });

  if (membership === null || membership.leftAt !== null) {
    return { error: "Chat not found", status: 404 };
  }

  const now = new Date();

  if (membership.chat.type === ChatType.private) {
    const partner = membership.chat.members.find((member) => member.userId !== userId);
    if (partner !== undefined && partner.deletedAt !== null) {
      await purgeChatMessages(chatId);
      await prisma.chatMember.updateMany({
        where: { chatId, userId: { in: [userId, partner.userId] } },
        data: {
          deletedAt: now,
          messagesVisibleFrom: now,
        },
      });
      return { ok: true };
    }
  }

  await prisma.chatMember.update({
    where: { id: membership.id },
    data: {
      deletedAt: now,
      messagesVisibleFrom: now,
    },
  });

  return { ok: true };
}

export async function leaveGroup(
  chatId: number,
  userId: number
): Promise<{ ok: true } | { error: string; status: number }> {
  const membership = await prisma.chatMember.findFirst({
    where: {
      chatId,
      userId,
      ...ACTIVE_MEMBER_WHERE,
    },
    include: {
      chat: { select: { type: true } },
    },
  });

  if (membership === null) {
    return { error: "Chat not found", status: 404 };
  }

  if (membership.chat.type !== ChatType.group) {
    return { error: "Can only leave group chats", status: 400 };
  }

  await prisma.chatMember.update({
    where: { id: membership.id },
    data: { leftAt: new Date() },
  });

  return { ok: true };
}

export type RestoredChatInfo = {
  userId: number;
  chatId: number;
  type: "private" | "group";
  name: string;
};

export async function restoreHiddenChatsForNewMessage(
  chatId: number,
  senderId: number
): Promise<RestoredChatInfo[]> {
  const hiddenMembers = await prisma.chatMember.findMany({
    where: {
      chatId,
      userId: { not: senderId },
      deletedAt: { not: null },
      leftAt: null,
    },
    include: {
      chat: {
        include: {
          members: {
            where: PRESENT_MEMBER_WHERE,
            include: { user: { select: { id: true, username: true } } },
          },
        },
      },
    },
  });

  const restored: RestoredChatInfo[] = [];

  for (const member of hiddenMembers) {
    await prisma.chatMember.update({
      where: { id: member.id },
      data: { deletedAt: null },
    });

    restored.push({
      userId: member.userId,
      chatId,
      type: member.chat.type,
      name: getChatDisplayName(member.chat, member.userId),
    });
  }

  return restored;
}

export async function reopenPrivateChatForUser(chatId: number, userId: number): Promise<void> {
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });

  if (membership === null || membership.leftAt !== null) {
    return;
  }

  const messageCount = await prisma.message.count({ where: { chatId } });

  await prisma.chatMember.update({
    where: { id: membership.id },
    data: {
      deletedAt: null,
      ...(messageCount === 0 ? { messagesVisibleFrom: null } : {}),
    },
  });
}

export async function reopenPrivateChatForBothUsers(chatId: number): Promise<void> {
  const messageCount = await prisma.message.count({ where: { chatId } });

  await prisma.chatMember.updateMany({
    where: { chatId, leftAt: null },
    data: {
      deletedAt: null,
      ...(messageCount === 0 ? { messagesVisibleFrom: null } : {}),
    },
  });
}

export async function setChatNotifications(
  chatId: number,
  userId: number,
  enabled: unknown
): Promise<{ notificationsEnabled: boolean } | { error: string; status: number }> {
  if (typeof enabled !== "boolean") {
    return { error: "Поле enabled должно быть boolean", status: 400 };
  }

  const membership = await prisma.chatMember.findFirst({
    where: {
      chatId,
      userId,
      ...ACTIVE_MEMBER_WHERE,
    },
    select: { id: true },
  });

  if (membership === null) {
    return { error: "Chat not found", status: 404 };
  }

  await prisma.chatMember.update({
    where: { id: membership.id },
    data: { notificationsEnabled: enabled },
  });

  return { notificationsEnabled: enabled };
}
