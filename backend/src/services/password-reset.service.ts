import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { getFrontendUrl, sendPasswordResetEmail } from "../lib/email.js";
import { hashPassword } from "../lib/password.js";
import { validateEmail } from "../lib/email-validation.js";
import { validateCredentials } from "../lib/validation.js";

const TOKEN_TTL_MS = 15 * 60 * 1000;

const GENERIC_FORGOT_MESSAGE =
  "Если email зарегистрирован, мы отправили письмо с инструкцией";

export async function requestPasswordReset(email: unknown): Promise<{ message: string }> {
  const validation = validateEmail(email);
  if (!validation.ok) {
    return { message: GENERIC_FORGOT_MESSAGE };
  }

  const user = await prisma.user.findUnique({
    where: { email: validation.email },
    select: { id: true, username: true, email: true },
  });

  if (user === null) {
    return { message: GENERIC_FORGOT_MESSAGE };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const resetUrl = `${getFrontendUrl()}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, user.username, resetUrl);

  return { message: GENERIC_FORGOT_MESSAGE };
}

export async function resetPasswordWithToken(
  token: unknown,
  newPassword: unknown
): Promise<{ ok: true } | { error: string; status: number }> {
  if (typeof token !== "string" || token.trim() === "") {
    return { error: "Ссылка недействительна или устарела", status: 400 };
  }

  const passwordValidation = validateCredentials("reset", newPassword);
  if (!passwordValidation.ok) {
    return { error: passwordValidation.message, status: 400 };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token: token.trim() },
    include: { user: { select: { id: true } } },
  });

  if (record === null) {
    return { error: "Ссылка недействительна или устарела", status: 400 };
  }

  if (record.usedAt !== null) {
    return { error: "Ссылка уже была использована", status: 400 };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return { error: "Ссылка недействительна или устарела", status: 400 };
  }

  const passwordHash = await hashPassword(passwordValidation.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
