import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/response.js";

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });

  if (user === null || user.role !== "admin") {
    sendError(res, "Доступ запрещён", 403);
    return;
  }

  next();
}
