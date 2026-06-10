import { prisma } from "../lib/prisma.js";

export async function isBlocked(blockerId: number, blockedId: number): Promise<boolean> {
  const block = await prisma.userBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
    select: { id: true },
  });

  return block !== null;
}

export async function blockUser(
  blockerId: number,
  blockedId: number
): Promise<{ ok: true } | { error: string; status: number }> {
  if (blockerId === blockedId) {
    return { error: "Cannot block yourself", status: 400 };
  }

  const target = await prisma.user.findUnique({
    where: { id: blockedId },
    select: { id: true },
  });

  if (target === null) {
    return { error: "User not found", status: 404 };
  }

  await prisma.userBlock.upsert({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
    create: { blockerId, blockedId },
    update: {},
  });

  return { ok: true };
}

export async function unblockUser(
  blockerId: number,
  blockedId: number
): Promise<{ ok: true } | { error: string; status: number }> {
  const existing = await prisma.userBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
    select: { id: true },
  });

  if (existing === null) {
    return { error: "User is not blocked", status: 404 };
  }

  await prisma.userBlock.delete({
    where: { id: existing.id },
  });

  return { ok: true };
}

export async function getBlockStatus(
  currentUserId: number,
  partnerId: number
): Promise<{ isBlockedByMe: boolean; isBlockedByPartner: boolean }> {
  const [isBlockedByMe, isBlockedByPartner] = await Promise.all([
    isBlocked(currentUserId, partnerId),
    isBlocked(partnerId, currentUserId),
  ]);

  return { isBlockedByMe, isBlockedByPartner };
}
