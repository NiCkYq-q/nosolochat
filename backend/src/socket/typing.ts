import type { Server } from "socket.io";
import { PRESENT_MEMBER_WHERE } from "../lib/chat-access.js";
import { prisma } from "../lib/prisma.js";

type TypingPayload = {
  chatId?: number;
};

export async function emitTypingEvent(
  io: Server,
  chatId: number,
  senderId: number,
  event: "user:typing" | "user:typing:stop",
  payload: { chatId: number; userId: number; username?: string }
): Promise<void> {
  const members = await prisma.chatMember.findMany({
    where: { chatId, ...PRESENT_MEMBER_WHERE },
    select: { userId: true },
  });

  for (const member of members) {
    if (member.userId === senderId) {
      continue;
    }

    io.to(`user:${String(member.userId)}`).emit(event, payload);
  }
}

export async function handleTypingStart(
  io: Server,
  chatId: number,
  userId: number
): Promise<void> {
  const membership = await prisma.chatMember.findFirst({
    where: { chatId, userId, ...PRESENT_MEMBER_WHERE },
    select: {
      user: {
        select: { username: true },
      },
    },
  });

  if (membership === null) {
    return;
  }

  await emitTypingEvent(io, chatId, userId, "user:typing", {
    chatId,
    userId,
    username: membership.user.username,
  });
}

export async function handleTypingStop(
  io: Server,
  chatId: number,
  userId: number
): Promise<void> {
  await emitTypingEvent(io, chatId, userId, "user:typing:stop", {
    chatId,
    userId,
  });
}

export function parseTypingPayload(payload: TypingPayload): number | null {
  const chatId = payload.chatId;
  if (typeof chatId !== "number" || !Number.isInteger(chatId) || chatId <= 0) {
    return null;
  }

  return chatId;
}
