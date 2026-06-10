import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { sendError, sendSuccess } from "../lib/response.js";
import { deleteUserByAdmin, listUsersForAdmin } from "../services/admin.service.js";
import { getSocketServer } from "../socket/io.js";
import { disconnectUserSockets } from "../socket/disconnect.js";
import { revokeUserTokens } from "../lib/token-blacklist.js";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

function parseUserId(rawId: string): number | null {
  const userId = Number.parseInt(rawId, 10);
  if (Number.isNaN(userId) || userId <= 0) {
    return null;
  }
  return userId;
}

adminRouter.get("/users", async (_req, res) => {
  const users = await listUsersForAdmin();
  sendSuccess(res, users);
});

adminRouter.delete("/users/:id", async (req, res) => {
  try {
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

    const result = await deleteUserByAdmin(auth.userId, userId);

    if ("error" in result) {
      sendError(res, result.error, result.status);
      return;
    }

    const io = getSocketServer();
    if (io !== null) {
      await disconnectUserSockets(io, userId);
    }
    revokeUserTokens(userId);

    sendSuccess(res, { message: "Пользователь удалён" });
  } catch (error) {
    console.error(error);
    sendError(res, "Не удалось удалить пользователя", 500);
  }
});
