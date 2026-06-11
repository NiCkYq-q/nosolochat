import type { Server } from "socket.io";
import { verifyToken } from "../lib/jwt.js";
import { sendMessage } from "../services/message.service.js";
import {
  addUserConnection,
  removeUserConnection,
  updateLastSeen,
} from "../services/presence.service.js";
import { emitMessageToChatMembers } from "./notifications.js";
import { setSocketServer } from "./io.js";
import { notifyUserOffline, notifyUserOnline } from "./presence.js";
import { handleTypingStart, handleTypingStop, parseTypingPayload } from "./typing.js";

const AUTH_TIMEOUT_MS = 10_000;

type AuthenticatePayload = {
  token?: string;
};

type MessageSendPayload = {
  chatId?: number;
  content?: string;
  replyToMessageIds?: number[];
  replyToMessageId?: number;
};

export function registerSocketHandlers(io: Server): void {
  setSocketServer(io);

  io.on("connection", (socket) => {
    let authenticatedUserId: number | null = null;

    const authTimer = setTimeout(() => {
      if (authenticatedUserId === null) {
        socket.emit("error", { message: "Authentication required" });
        socket.disconnect(true);
      }
    }, AUTH_TIMEOUT_MS);

    socket.on("authenticate", (payload: AuthenticatePayload) => {
      try {
        const token = payload.token;
        if (token === undefined || token === "") {
          throw new Error("Missing token");
        }

        const auth = verifyToken(token);
        authenticatedUserId = auth.userId;
        clearTimeout(authTimer);

        void socket.join(`user:${String(auth.userId)}`);

        const becameOnline = addUserConnection(auth.userId, socket.id);
        socket.emit("authenticated", { userId: auth.userId });

        if (becameOnline) {
          void notifyUserOnline(io, auth.userId);
        }
      } catch {
        socket.emit("error", { message: "Invalid or expired token" });
        socket.disconnect(true);
      }
    });

    socket.on("typing:start", (payload: { chatId?: number }) => {
      void (async () => {
        if (authenticatedUserId === null) {
          return;
        }

        const chatId = parseTypingPayload(payload);
        if (chatId === null) {
          return;
        }

        await handleTypingStart(io, chatId, authenticatedUserId);
      })();
    });

    socket.on("typing:stop", (payload: { chatId?: number }) => {
      void (async () => {
        if (authenticatedUserId === null) {
          return;
        }

        const chatId = parseTypingPayload(payload);
        if (chatId === null) {
          return;
        }

        await handleTypingStop(io, chatId, authenticatedUserId);
      })();
    });

    socket.on("message:send", (payload: MessageSendPayload) => {
      void (async () => {
        if (authenticatedUserId === null) {
          socket.emit("error", { message: "Authentication required" });
          return;
        }

        const chatId = payload.chatId;
        if (typeof chatId !== "number" || !Number.isInteger(chatId) || chatId <= 0) {
          socket.emit("error", { message: "Valid chatId is required" });
          return;
        }

        const result = await sendMessage(
          chatId,
          authenticatedUserId,
          payload.content,
          payload.replyToMessageIds,
          payload.replyToMessageId
        );
        if ("error" in result) {
          socket.emit("error", { message: result.error });
          return;
        }

        await emitMessageToChatMembers(
          io,
          { ...result.message, chatId },
          result.restoredChats
        );
      })().catch(() => {
        socket.emit("error", { message: "Failed to send message" });
      });
    });

    socket.on("disconnect", () => {
      clearTimeout(authTimer);

      if (authenticatedUserId === null) {
        return;
      }

      const wentOffline = removeUserConnection(authenticatedUserId, socket.id);
      if (!wentOffline) {
        return;
      }

      void (async () => {
        const lastSeen = await updateLastSeen(authenticatedUserId);
        await notifyUserOffline(io, authenticatedUserId, lastSeen);
      })();
    });
  });
}
