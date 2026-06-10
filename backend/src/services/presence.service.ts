import { ChatType } from "@prisma/client";
import { ACTIVE_MEMBER_WHERE } from "../lib/chat-access.js";
import { prisma } from "../lib/prisma.js";

const onlineSockets = new Map<number, Set<string>>();

export function isUserOnline(userId: number): boolean {
  const sockets = onlineSockets.get(userId);
  return sockets !== undefined && sockets.size > 0;
}

export function addUserConnection(userId: number, socketId: string): boolean {
  let sockets = onlineSockets.get(userId);
  const wasOnline = sockets !== undefined && sockets.size > 0;

  if (sockets === undefined) {
    sockets = new Set();
    onlineSockets.set(userId, sockets);
  }

  sockets.add(socketId);
  return !wasOnline;
}

export function removeUserConnection(userId: number, socketId: string): boolean {
  const sockets = onlineSockets.get(userId);
  if (sockets === undefined) {
    return false;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineSockets.delete(userId);
    return true;
  }

  return false;
}

export async function updateLastSeen(userId: number): Promise<string> {
  const now = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: { lastSeen: now },
  });

  return now.toISOString();
}

export type UserStatus = {
  isOnline: boolean;
  lastSeen: string | null;
};

export async function getUserStatus(userId: number): Promise<UserStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeen: true },
  });

  if (user === null) {
    return null;
  }

  return {
    isOnline: isUserOnline(userId),
    lastSeen: user.lastSeen === null ? null : user.lastSeen.toISOString(),
  };
}

export async function getPrivateChatPartnerIds(userId: number): Promise<number[]> {
  const memberships = await prisma.chatMember.findMany({
    where: {
      userId,
      ...ACTIVE_MEMBER_WHERE,
      chat: { type: ChatType.private },
    },
    include: {
      chat: {
        include: {
          members: { select: { userId: true } },
        },
      },
    },
  });

  const partnerIds = new Set<number>();

  for (const membership of memberships) {
    for (const member of membership.chat.members) {
      if (member.userId !== userId) {
        partnerIds.add(member.userId);
      }
    }
  }

  return [...partnerIds];
}
