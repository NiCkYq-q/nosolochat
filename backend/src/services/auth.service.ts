import { Prisma, Role } from "@prisma/client";
import { validateEmail } from "../lib/email-validation.js";
import { signToken } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { validateCredentials } from "../lib/validation.js";
import { prisma } from "../lib/prisma.js";
import type { AuthResult, AuthUser, LoginInput, RegisterInput } from "../types/auth.js";

function toAuthUser(user: { id: number; username: string; email: string; role: Role }): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

function buildAuthResult(user: { id: number; username: string; email: string; role: Role }): AuthResult {
  const authUser = toAuthUser(user);
  const token = signToken({ userId: authUser.id, username: authUser.username });
  return { user: authUser, token };
}

export async function registerUser(
  input: RegisterInput
): Promise<AuthResult | { error: string; status: number }> {
  const validation = validateCredentials(input.username, input.password);
  if (!validation.ok) {
    return { error: validation.message, status: 400 };
  }

  const emailValidation = validateEmail(input.email);
  if (!emailValidation.ok) {
    return { error: emailValidation.message, status: 400 };
  }

  const passwordHash = await hashPassword(validation.password);

  try {
    const user = await prisma.user.create({
      data: {
        username: validation.username,
        email: emailValidation.email,
        passwordHash,
        role: Role.user,
      },
      select: { id: true, username: true, email: true, role: true },
    });

    return buildAuthResult(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes("email")) {
        return { error: "Email уже используется", status: 409 };
      }
      return { error: "Username already taken", status: 409 };
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResult | { error: string; status: number }> {
  const validation = validateCredentials(input.username, input.password);
  if (!validation.ok) {
    return { error: validation.message, status: 400 };
  }

  const user = await prisma.user.findUnique({
    where: { username: validation.username },
    select: { id: true, username: true, email: true, role: true, passwordHash: true },
  });

  if (user === null) {
    return { error: "Invalid username or password", status: 401 };
  }

  const isValidPassword = await verifyPassword(validation.password, user.passwordHash);
  if (!isValidPassword) {
    return { error: "Invalid username or password", status: 401 };
  }

  return buildAuthResult(user);
}

export async function getCurrentUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, role: true },
  });
}

export async function ensureDefaultAdminUser(): Promise<void> {
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
    select: { id: true },
  });

  if (existingAdmin !== null) {
    await prisma.user.update({
      where: { username: "admin" },
      data: { role: Role.admin, email: "admin@nosolo.local" },
    });
    return;
  }

  const passwordHash = await hashPassword("admin");
  await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@nosolo.local",
      passwordHash,
      role: Role.admin,
    },
  });
}
