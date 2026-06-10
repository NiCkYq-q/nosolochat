import type { Server } from "socket.io";

export async function disconnectUserSockets(io: Server, userId: number): Promise<void> {
  const sockets = await io.in(`user:${String(userId)}`).fetchSockets();
  for (const socket of sockets) {
    socket.disconnect(true);
  }
}
