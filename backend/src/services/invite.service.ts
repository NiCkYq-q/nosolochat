import { ChatType, InviteStatus, InviteType } from "@prisma/client";
import { ACTIVE_MEMBER_WHERE } from "../lib/chat-access.js";
import { prisma } from "../lib/prisma.js";
import { isBlocked } from "./block.service.js";
import { reopenPrivateChatForBothUsers, reopenPrivateChatForUser } from "./chat.service.js";

export type InviteDto = {
  id: number;
  type: "private" | "group";
  fromUserId: number;
  fromUsername: string;
  chatId: number | null;
  groupName: string | null;
  createdAt: string;
};

async function findActivePrivateChat(userIdA: number, userIdB: number) {
  const chats = await prisma.chat.findMany({
    where: {
      type: ChatType.private,
      AND: [
        { members: { some: { userId: userIdA, ...ACTIVE_MEMBER_WHERE } } },
        { members: { some: { userId: userIdB, ...ACTIVE_MEMBER_WHERE } } },
      ],
    },
    include: {
      members: {
        where: ACTIVE_MEMBER_WHERE,
      },
    },
  });

  return chats.find((chat) => chat.members.length === 2) ?? null;
}

async function findPrivateChatBetween(userIdA: number, userIdB: number) {
  const chat = await prisma.chat.findFirst({
    where: {
      type: ChatType.private,
      AND: [
        { members: { some: { userId: userIdA, leftAt: null } } },
        { members: { some: { userId: userIdB, leftAt: null } } },
      ],
    },
    select: { id: true },
  });

  return chat;
}

async function createPrivateChatBetween(userIdA: number, userIdB: number): Promise<number> {
  const existing = await findActivePrivateChat(userIdA, userIdB);
  if (existing !== null) {
    return existing.id;
  }

  const existingAny = await findPrivateChatBetween(userIdA, userIdB);

  if (existingAny !== null) {
    await reopenPrivateChatForBothUsers(existingAny.id);
    return existingAny.id;
  }

  const chat = await prisma.chat.create({
    data: {
      type: ChatType.private,
      createdById: userIdA,
      members: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
    select: { id: true },
  });

  return chat.id;
}

export async function requestPrivateChat(
  currentUserId: number,
  targetUserId: number
): Promise<
  | { chatId: number; existing: true }
  | { inviteId: number; pending: true }
  | { error: string; status: number }
> {
  if (targetUserId === currentUserId) {
    return { error: "Cannot create a chat with yourself", status: 400 };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (targetUser === null) {
    return { error: "User not found", status: 404 };
  }

  if (await isBlocked(targetUserId, currentUserId)) {
    return { error: "Пользователь добавил вас в чёрный список", status: 403 };
  }

  const existingChat = await findActivePrivateChat(currentUserId, targetUserId);
  if (existingChat !== null) {
    return { chatId: existingChat.id, existing: true };
  }

  const hiddenChat = await findPrivateChatBetween(currentUserId, targetUserId);
  if (hiddenChat !== null) {
    await reopenPrivateChatForUser(hiddenChat.id, currentUserId);
    return { chatId: hiddenChat.id, existing: true };
  }

  const pendingInvite = await prisma.chatInvite.findFirst({
    where: {
      type: InviteType.private,
      status: InviteStatus.pending,
      OR: [
        { fromUserId: currentUserId, toUserId: targetUserId },
        { fromUserId: targetUserId, toUserId: currentUserId },
      ],
    },
    select: { id: true, fromUserId: true },
  });

  if (pendingInvite !== null) {
    if (pendingInvite.fromUserId === currentUserId) {
      return { inviteId: pendingInvite.id, pending: true };
    }
    return { error: "У вас уже есть входящий запрос от этого пользователя", status: 409 };
  }

  const invite = await prisma.chatInvite.create({
    data: {
      type: InviteType.private,
      fromUserId: currentUserId,
      toUserId: targetUserId,
    },
    select: { id: true },
  });

  return { inviteId: invite.id, pending: true };
}

const GROUP_NAME_MIN_LENGTH = 1;
const GROUP_NAME_MAX_LENGTH = 64;

export type CreateGroupResult = {
  chatId: number;
  name: string;
  inviteIds: number[];
};

export async function createGroupWithInvites(
  currentUserId: number,
  name: unknown,
  members: unknown
): Promise<CreateGroupResult | { error: string; status: number }> {
  if (typeof name !== "string" || name.trim().length < GROUP_NAME_MIN_LENGTH) {
    return { error: "Group name is required", status: 400 };
  }

  const trimmedName = name.trim();
  if (trimmedName.length > GROUP_NAME_MAX_LENGTH) {
    return {
      error: `Group name must be at most ${String(GROUP_NAME_MAX_LENGTH)} characters`,
      status: 400,
    };
  }

  if (!Array.isArray(members)) {
    return { error: "Members must be an array", status: 400 };
  }

  const memberIds = [
    ...new Set(
      members.filter(
        (id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0
      )
    ),
  ].filter((id) => id !== currentUserId);

  if (memberIds.length === 0) {
    return { error: "Select at least one participant to invite", status: 400 };
  }

  const existingUsers = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true },
  });

  if (existingUsers.length !== memberIds.length) {
    return { error: "One or more users not found", status: 404 };
  }

  const chat = await prisma.chat.create({
    data: {
      type: ChatType.group,
      name: trimmedName,
      createdById: currentUserId,
      members: {
        create: [{ userId: currentUserId }],
      },
    },
    select: { id: true },
  });

  const invites = await Promise.all(
    memberIds.map((toUserId) =>
      prisma.chatInvite.create({
        data: {
          type: InviteType.group,
          fromUserId: currentUserId,
          toUserId,
          chatId: chat.id,
          groupName: trimmedName,
        },
        select: { id: true },
      })
    )
  );

  return {
    chatId: chat.id,
    name: trimmedName,
    inviteIds: invites.map((invite) => invite.id),
  };
}

export async function inviteUserToGroup(
  chatId: number,
  fromUserId: number,
  toUserId: number
): Promise<{ inviteId: number; pending: true } | { error: string; status: number }> {
  if (toUserId === fromUserId) {
    return { error: "Cannot invite yourself", status: 400 };
  }

  const membership = await prisma.chatMember.findFirst({
    where: {
      chatId,
      userId: fromUserId,
      ...ACTIVE_MEMBER_WHERE,
    },
    include: {
      chat: { select: { type: true, name: true } },
    },
  });

  if (membership === null) {
    return { error: "Chat not found", status: 404 };
  }

  if (membership.chat.type !== ChatType.group) {
    return { error: "Can only invite users to group chats", status: 400 };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true },
  });

  if (targetUser === null) {
    return { error: "User not found", status: 404 };
  }

  if (await isBlocked(toUserId, fromUserId)) {
    return { error: "Пользователь добавил вас в чёрный список", status: 403 };
  }

  const existingMember = await prisma.chatMember.findFirst({
    where: {
      chatId,
      userId: toUserId,
      ...ACTIVE_MEMBER_WHERE,
    },
    select: { id: true },
  });

  if (existingMember !== null) {
    return { error: "User is already a member of this group", status: 409 };
  }

  const pendingInvite = await prisma.chatInvite.findFirst({
    where: {
      chatId,
      toUserId,
      type: InviteType.group,
      status: InviteStatus.pending,
    },
    select: { id: true },
  });

  if (pendingInvite !== null) {
    return { inviteId: pendingInvite.id, pending: true };
  }

  const groupName = membership.chat.name ?? "Группа";

  const invite = await prisma.chatInvite.create({
    data: {
      type: InviteType.group,
      fromUserId,
      toUserId,
      chatId,
      groupName,
    },
    select: { id: true },
  });

  return { inviteId: invite.id, pending: true };
}

export async function getPendingInvites(userId: number): Promise<InviteDto[]> {
  const invites = await prisma.chatInvite.findMany({
    where: {
      toUserId: userId,
      status: InviteStatus.pending,
    },
    include: {
      fromUser: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invites.map((invite) => ({
    id: invite.id,
    type: invite.type,
    fromUserId: invite.fromUserId,
    fromUsername: invite.fromUser.username,
    chatId: invite.chatId,
    groupName: invite.groupName,
    createdAt: invite.createdAt.toISOString(),
  }));
}

export async function acceptInvite(
  inviteId: number,
  userId: number
): Promise<
  | { type: "private"; chatId: number; fromUserId: number }
  | { type: "group"; chatId: number; fromUserId: number }
  | { error: string; status: number }
> {
  const invite = await prisma.chatInvite.findUnique({
    where: { id: inviteId },
    include: {
      fromUser: { select: { username: true } },
    },
  });

  if (invite === null || invite.toUserId !== userId) {
    return { error: "Invite not found", status: 404 };
  }

  if (invite.status !== InviteStatus.pending) {
    return { error: "Invite already responded", status: 409 };
  }

  const now = new Date();

  if (invite.type === InviteType.private) {
    const chatId = await createPrivateChatBetween(invite.fromUserId, invite.toUserId);

    await prisma.chatInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.accepted, respondedAt: now, chatId },
    });

    return { type: "private", chatId, fromUserId: invite.fromUserId };
  }

  if (invite.chatId === null) {
    return { error: "Invalid group invite", status: 400 };
  }

  await prisma.chatMember.upsert({
    where: {
      chatId_userId: { chatId: invite.chatId, userId },
    },
    create: {
      chatId: invite.chatId,
      userId,
    },
    update: {
      leftAt: null,
      deletedAt: null,
      messagesVisibleFrom: null,
    },
  });

  await prisma.chatInvite.update({
    where: { id: inviteId },
    data: { status: InviteStatus.accepted, respondedAt: now },
  });

  return { type: "group", chatId: invite.chatId, fromUserId: invite.fromUserId };
}

export async function rejectInvite(
  inviteId: number,
  userId: number
): Promise<{ fromUserId: number; type: InviteType } | { error: string; status: number }> {
  const invite = await prisma.chatInvite.findUnique({
    where: { id: inviteId },
  });

  if (invite === null || invite.toUserId !== userId) {
    return { error: "Invite not found", status: 404 };
  }

  if (invite.status !== InviteStatus.pending) {
    return { error: "Invite already responded", status: 409 };
  }

  await prisma.chatInvite.update({
    where: { id: inviteId },
    data: {
      status: InviteStatus.rejected,
      respondedAt: new Date(),
    },
  });

  return { fromUserId: invite.fromUserId, type: invite.type };
}

export async function getInviteById(inviteId: number) {
  return prisma.chatInvite.findUnique({
    where: { id: inviteId },
    include: {
      fromUser: { select: { id: true, username: true } },
      toUser: { select: { id: true, username: true } },
    },
  });
}
