import type { Server } from "socket.io";
import { getPrivateChatPartnerIds } from "../services/presence.service.js";

export async function notifyUserOnline(io: Server, userId: number): Promise<void> {
  const partnerIds = await getPrivateChatPartnerIds(userId);

  for (const partnerId of partnerIds) {
    io.to(`user:${String(partnerId)}`).emit("user:online", { userId });
  }
}

export async function notifyUserOffline(
  io: Server,
  userId: number,
  lastSeen: string
): Promise<void> {
  const partnerIds = await getPrivateChatPartnerIds(userId);

  for (const partnerId of partnerIds) {
    io.to(`user:${String(partnerId)}`).emit("user:offline", { userId, lastSeen });
  }
}
