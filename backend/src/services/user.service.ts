import { prisma } from "../lib/prisma.js";
import { getUserStatus, type UserStatus } from "./presence.service.js";

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 20;

export async function searchUsers(
  currentUserId: number,
  query: string
): Promise<Array<{ id: number; username: string }> | { error: string; status: number }> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
    return { error: `Search query must be at least ${String(MIN_SEARCH_LENGTH)} characters`, status: 400 };
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      username: { contains: trimmedQuery },
    },
    select: { id: true, username: true },
    orderBy: { username: "asc" },
    take: MAX_SEARCH_RESULTS,
  });

  return users;
}

export async function fetchUserStatus(
  userId: number
): Promise<UserStatus | { error: string; status: number }> {
  const status = await getUserStatus(userId);

  if (status === null) {
    return { error: "User not found", status: 404 };
  }

  return status;
}
