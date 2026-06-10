import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { sendError } from "../lib/response.js";
import { isUserTokenRevoked } from "../lib/token-blacklist.js";
import { prisma } from "../lib/prisma.js";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (header === undefined || !header.startsWith("Bearer ")) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  if (token === "") {
    sendError(res, "Authentication required", 401);
    return;
  }

  try {
    const payload = verifyToken(token);

    if (isUserTokenRevoked(payload.userId)) {
      sendError(res, "Invalid or expired token", 401);
      return;
    }

    req.auth = payload;
    next();
  } catch {
    sendError(res, "Invalid or expired token", 401);
  }
}

export async function authenticateUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const token =
    header !== undefined && header.startsWith("Bearer ")
      ? header.slice("Bearer ".length).trim()
      : queryToken;

  if (token === undefined || token === "") {
    sendError(res, "Authentication required", 401);
    return;
  }

  try {
    const payload = verifyToken(token);

    if (isUserTokenRevoked(payload.userId)) {
      sendError(res, "Invalid or expired token", 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });

    if (user === null) {
      sendError(res, "Authentication required", 401);
      return;
    }

    req.auth = payload;
    next();
  } catch {
    sendError(res, "Invalid or expired token", 401);
  }
}
