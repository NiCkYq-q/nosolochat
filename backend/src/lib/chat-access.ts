import { ChatType } from "@prisma/client";
import { prisma } from "./prisma.js";

export const ACTIVE_MEMBER_WHERE = {
  leftAt: null,
  deletedAt: null,
} as const;

export const PRESENT_MEMBER_WHERE = {
  leftAt: null,
} as const;

export function getMessageCutoff(messagesVisibleFrom: Date | null): Date | null {
  return messagesVisibleFrom;
}

export async function requireChatMember(chatId: number, userId: number) {
  return prisma.chatMember.findFirst({
    where: {
      chatId,
      userId,
      ...ACTIVE_MEMBER_WHERE,
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
}

export function getChatDisplayName(
  chat: {
    type: ChatType;
    name: string | null;
    members: Array<{ userId: number; user: { username: string } }>;
  },
  currentUserId: number
): string {
  if (chat.type === ChatType.group) {
    return chat.name ?? "Группа";
  }

  const otherMember = chat.members.find((member) => member.userId !== currentUserId);
  return otherMember?.user.username ?? "Чат";
}
