import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.js";
import { sendError, sendSuccess } from "../lib/response.js";
import {
  deleteChatForUser,
  getChatsForUser,
  leaveGroup,
  setChatNotifications,
} from "../services/chat.service.js";
import {
  createGroupWithInvites,
  getInviteById,
  inviteUserToGroup,
  requestPrivateChat,
} from "../services/invite.service.js";
import {
  getChatDetails,
  getMessages,
  markChatAsRead,
  parseMessagesQuery,
  sendMessage,
} from "../services/message.service.js";
import { getSocketServer } from "../socket/io.js";
import {
  emitGroupCreatedForUser,
  emitGroupInvite,
  emitMessageToChatMembers,
  emitMessageRead,
  emitPrivateChatRequest,
  emitUnreadUpdate,
} from "../socket/notifications.js";
import { uploadChatImage } from "../services/upload.service.js";

export const chatsRouter = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

chatsRouter.use(authenticate);

function parseChatId(rawId: string | string[]): number | null {
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const chatId = Number.parseInt(id, 10);
  if (Number.isNaN(chatId) || chatId <= 0) {
    return null;
  }
  return chatId;
}

chatsRouter.get("/", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chats = await getChatsForUser(auth.userId);
  sendSuccess(res, chats);
});

chatsRouter.post("/private", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const body = req.body as unknown;
  const userId =
    typeof body === "object" && body !== null && "userId" in body ? body.userId : undefined;

  if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
    sendError(res, "Valid userId is required", 400);
    return;
  }

  const result = await requestPrivateChat(auth.userId, userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();

  if ("existing" in result) {
    sendSuccess(res, { chatId: result.chatId, existing: true });
    return;
  }

  if ("pending" in result && io !== null) {
    const invite = await getInviteById(result.inviteId);
    if (invite !== null) {
      emitPrivateChatRequest(io, userId, {
        inviteId: invite.id,
        fromUserId: invite.fromUserId,
        fromUsername: invite.fromUser.username,
      });
    }
    sendSuccess(res, { inviteId: result.inviteId, pending: true }, 202);
    return;
  }

  sendSuccess(res, result);
});

chatsRouter.post("/group", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const body = req.body as unknown;
  const name =
    typeof body === "object" && body !== null && "name" in body ? body.name : undefined;
  const members =
    typeof body === "object" && body !== null && "members" in body ? body.members : undefined;

  const result = await createGroupWithInvites(auth.userId, name, members);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();
  if (io !== null) {
    emitGroupCreatedForUser(io, auth.userId, {
      id: result.chatId,
      name: result.name,
    });

    for (const inviteId of result.inviteIds) {
      const invite = await getInviteById(inviteId);
      if (invite !== null && invite.chatId !== null && invite.groupName !== null) {
        emitGroupInvite(io, invite.toUserId, {
          inviteId: invite.id,
          chatId: invite.chatId,
          groupName: invite.groupName,
          fromUserId: invite.fromUserId,
          fromUsername: invite.fromUser.username,
        });
      }
    }
  }

  sendSuccess(res, { chatId: result.chatId }, 201);
});

chatsRouter.delete("/:chatId", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const result = await deleteChatForUser(chatId, auth.userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, null);
});

chatsRouter.post("/:chatId/members", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const body = req.body as unknown;
  const userId =
    typeof body === "object" && body !== null && "userId" in body ? body.userId : undefined;

  if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
    sendError(res, "Valid userId is required", 400);
    return;
  }

  const result = await inviteUserToGroup(chatId, auth.userId, userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();
  if (io !== null) {
    const invite = await getInviteById(result.inviteId);
    if (invite !== null && invite.chatId !== null && invite.groupName !== null) {
      emitGroupInvite(io, userId, {
        inviteId: invite.id,
        chatId: invite.chatId,
        groupName: invite.groupName,
        fromUserId: invite.fromUserId,
        fromUsername: invite.fromUser.username,
      });
    }
  }

  sendSuccess(res, { inviteId: result.inviteId, pending: true }, 202);
});

chatsRouter.post("/:chatId/leave", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const result = await leaveGroup(chatId, auth.userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, null);
});

chatsRouter.get("/:chatId", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const result = await getChatDetails(chatId, auth.userId);
  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, result);
});

chatsRouter.get("/:chatId/messages", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const { page, limit } = parseMessagesQuery(req.query);
  const result = await getMessages(chatId, auth.userId, page, limit);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, result);
});

chatsRouter.post("/:chatId/upload", imageUpload.single("image"), async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const result = await uploadChatImage(chatId, auth.userId, req.file);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();
  if (io !== null) {
    await emitMessageToChatMembers(
      io,
      { ...result.message, chatId },
      result.restoredChats
    );
  }

  sendSuccess(res, result.message, 201);
});

chatsRouter.post("/:chatId/messages", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const body = req.body as unknown;
  const content =
    typeof body === "object" && body !== null && "content" in body ? body.content : undefined;
  const replyToMessageIds =
    typeof body === "object" && body !== null && "replyToMessageIds" in body
      ? body.replyToMessageIds
      : undefined;
  const replyToMessageId =
    typeof body === "object" && body !== null && "replyToMessageId" in body
      ? body.replyToMessageId
      : undefined;

  const result = await sendMessage(
    chatId,
    auth.userId,
    content,
    replyToMessageIds,
    replyToMessageId
  );

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();
  if (io !== null) {
    await emitMessageToChatMembers(
      io,
      { ...result.message, chatId },
      result.restoredChats
    );
  }

  sendSuccess(res, result.message, 201);
});

chatsRouter.patch("/:chatId/notifications", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const body = req.body as unknown;
  const enabled =
    typeof body === "object" && body !== null && "enabled" in body ? body.enabled : undefined;

  const result = await setChatNotifications(chatId, auth.userId, enabled);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, result);
});

chatsRouter.post("/:chatId/read", async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const chatId = parseChatId(req.params.chatId);
  if (chatId === null) {
    sendError(res, "Invalid chat id", 400);
    return;
  }

  const result = await markChatAsRead(chatId, auth.userId);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  const io = getSocketServer();
  if (io !== null) {
    await emitUnreadUpdate(io, chatId, auth.userId);
    await emitMessageRead(io, chatId, auth.userId, result.messageIds);
  }

  sendSuccess(res, null);
});
