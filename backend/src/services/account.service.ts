import { verifyPassword } from "../lib/password.js";
import { revokeUserTokens } from "../lib/token-blacklist.js";
import { prisma } from "../lib/prisma.js";

export async function deleteOwnAccount(
  userId: number,
  password: unknown
): Promise<{ ok: true } | { error: string; status: number }> {
  if (typeof password !== "string" || password === "") {
    return { error: "Неверный пароль", status: 400 };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (user === null) {
    return { error: "User not found", status: 404 };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "Неверный пароль", status: 401 };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return { error: "Не удалось удалить аккаунт", status: 500 };
  }

  revokeUserTokens(userId);

  return { ok: true };
}
