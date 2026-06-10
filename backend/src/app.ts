import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { getEnv } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { sendError } from "./lib/response.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { chatsRouter } from "./routes/chats.js";
import { invitesRouter } from "./routes/invites.js";
import { usersRouter } from "./routes/users.js";
import { getUploadsDir } from "./services/upload.service.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: getEnv("CORS_ORIGIN", "http://localhost:5173"),
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/health/db", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown database error";
      res.status(503).json({ status: "error", database: "disconnected", message });
    }
  });

  app.use("/uploads", express.static(getUploadsDir()));

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/invites", invitesRouter);
  app.use("/api/chats", chatsRouter);
  app.use("/api/admin", adminRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    sendError(res, "Internal server error", 500);
  });

  return app;
}
