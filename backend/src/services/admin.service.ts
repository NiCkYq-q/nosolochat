import { prisma } from "../lib/prisma.js";
import { isUserOnline } from "./presence.service.js";

export type AdminUserDto = {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  lastSeen: string | null;
  isOnline: boolean;
};

export async function listUsersForAdmin(): Promise<AdminUserDto[]> {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      lastSeen: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    lastSeen: user.lastSeen === null ? null : user.lastSeen.toISOString(),
    isOnline: isUserOnline(user.id),
  }));
}

export async function deleteUserByAdmin(
  adminId: number,
  targetUserId: number
): Promise<{ ok: true } | { error: string; status: number }> {
  if (adminId === targetUserId) {
    return { error: "Нельзя удалить собственный аккаунт через эту панель", status: 400 };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (target === null) {
    return { error: "Пользователь не найден", status: 404 };
  }

  try {
    await prisma.user.delete({ where: { id: targetUserId } });
  } catch {
    return { error: "Не удалось удалить пользователя", status: 500 };
  }

  return { ok: true };
}
