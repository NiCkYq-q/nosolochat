import "dotenv/config";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { getEnv, getEnvNumber } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { ensureDefaultAdminUser } from "./services/auth.service.js";
import { registerSocketHandlers } from "./socket/index.js";

const app = createApp();
const httpServer = createServer(app);
const port = getEnvNumber("PORT", 3001);
const corsOrigin = getEnv("CORS_ORIGIN", "http://localhost:5173");

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

registerSocketHandlers(io);

async function start() {
  await prisma.$connect();
  await ensureDefaultAdminUser();

  httpServer.listen(port, () => {
    console.log(`Backend listening on http://localhost:${String(port)}`);
  });
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`Failed to start backend: ${message}`);
  process.exit(1);
});

process.on("SIGINT", () => {
  void prisma.$disconnect().finally(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  void prisma.$disconnect().finally(() => {
    process.exit(0);
  });
});
