import { InviteType } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { sendError, sendSuccess } from "../lib/response.js";
import {
  acceptInvite,
  getInviteById,
  getPendingInvites,
  rejectInvite,
} from "../services/invite.service.js";
import { getSocketServer } from "../socket/io.js";
import {
  emitGroupCreatedForUser,
  emitGroupInviteRejected,
  emitPrivateChatAccepted,
  emitPrivateChatRejected,
} from "../socket/notifications.js";

export const invitesRouter = Router();

invitesRouter.use(authenticate);

function parseInviteId(rawId: string): number | null {
  const inviteId = Number.parseInt(rawId, 10);
  if (Number.isNaN(inviteId) || inviteId <= 0) {
    return null;
  }
  return inviteId;
}

invitesRouter.get("/", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const invites = await getPendingInvites(auth.userId);
  sendSuccess(res, invites);
});

invitesRouter.post("/:inviteId/accept", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const inviteId = parseInviteId(req.params.inviteId);
  if (inviteId === null) {
    sendError(res, "Invalid invite id", 400);
    return;
  }

  const inviteBefore = await getInviteById(inviteId);
  const result = await acceptInvite(inviteId, auth.userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();
  if (io !== null && inviteBefore !== null) {
    if (result.type === "private") {
      emitPrivateChatAccepted(io, result.fromUserId, {
        chatId: result.chatId,
        acceptedByUsername: inviteBefore.toUser.username,
      });

      io.to(`user:${String(auth.userId)}`).emit("chat:created", {
        id: result.chatId,
        type: "private",
        name: inviteBefore.fromUser.username,
      });
      io.to(`user:${String(result.fromUserId)}`).emit("chat:created", {
        id: result.chatId,
        type: "private",
        name: inviteBefore.toUser.username,
      });
    } else {
      emitGroupCreatedForUser(io, auth.userId, {
        id: result.chatId,
        name: inviteBefore.groupName ?? "Группа",
      });
    }
  }

  sendSuccess(res, result);
});

invitesRouter.post("/:inviteId/reject", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const inviteId = parseInviteId(req.params.inviteId);
  if (inviteId === null) {
    sendError(res, "Invalid invite id", 400);
    return;
  }

  const inviteBefore = await getInviteById(inviteId);
  const result = await rejectInvite(inviteId, auth.userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();
  if (io !== null && inviteBefore !== null) {
    if (result.type === InviteType.private) {
      emitPrivateChatRejected(io, result.fromUserId, {
        rejectedByUsername: inviteBefore.toUser.username,
      });
    } else {
      emitGroupInviteRejected(io, result.fromUserId, {
        rejectedByUsername: inviteBefore.toUser.username,
        groupName: inviteBefore.groupName ?? "Группа",
      });
    }
  }

  sendSuccess(res, null);
});
