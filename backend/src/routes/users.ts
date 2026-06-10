import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { sendError, sendSuccess } from "../lib/response.js";
import { deleteOwnAccount } from "../services/account.service.js";
import { blockUser, unblockUser } from "../services/block.service.js";
import { fetchUserStatus, searchUsers } from "../services/user.service.js";
import { getSocketServer } from "../socket/io.js";
import { disconnectUserSockets } from "../socket/disconnect.js";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.delete("/me", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const body = req.body as unknown;
  const password =
    typeof body === "object" && body !== null && "password" in body ? body.password : undefined;

  const result = await deleteOwnAccount(auth.userId, password);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();
  if (io !== null) {
    await disconnectUserSockets(io, auth.userId);
  }

  sendSuccess(res, { message: "Аккаунт удалён" });
});

function parseUserId(rawId: string): number | null {
  const userId = Number.parseInt(rawId, 10);
  if (Number.isNaN(userId) || userId <= 0) {
    return null;
  }
  return userId;
}

usersRouter.get("/search", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const query = typeof req.query.q === "string" ? req.query.q : "";
  const result = await searchUsers(auth.userId, query);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, result);
});

usersRouter.post("/:id/block", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const userId = parseUserId(req.params.id);
  if (userId === null) {
    sendError(res, "Invalid user id", 400);
    return;
  }

  const result = await blockUser(auth.userId, userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, null);
});

usersRouter.delete("/:id/block", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const userId = parseUserId(req.params.id);
  if (userId === null) {
    sendError(res, "Invalid user id", 400);
    return;
  }

  const result = await unblockUser(auth.userId, userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, null);
});

usersRouter.get("/:id/status", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const userId = parseUserId(req.params.id);
  if (userId === null) {
    sendError(res, "Invalid user id", 400);
    return;
  }

  const result = await fetchUserStatus(userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, result);
});
