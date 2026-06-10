import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const REQUIRED_TABLES = ["User", "Chat", "ChatMember", "Message", "MessageRead"] as const;

async function verifyTablesExist(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
    ORDER BY name
  `;

  const tableNames = new Set(tables.map((table) => table.name));
  const missing = REQUIRED_TABLES.filter((name) => !tableNames.has(name));

  if (missing.length > 0) {
    throw new Error(`Missing tables: ${missing.join(", ")}`);
  }

  console.log(`Tables OK: ${REQUIRED_TABLES.join(", ")}`);
}

async function verifyPersistence(): Promise<void> {
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (admin === null) {
    throw new Error('Test user "admin" not found. Start the backend once to seed it.');
  }

  const chat = await prisma.chat.create({
    data: {
      type: "private",
      createdById: admin.id,
      members: {
        create: [{ userId: admin.id }],
      },
      messages: {
        create: {
          senderId: admin.id,
          content: "Phase 3 persistence check",
          reads: {
            create: {
              userId: admin.id,
              readAt: new Date(),
            },
          },
        },
      },
    },
    include: {
      members: true,
      messages: { include: { reads: true } },
    },
  });

  const loaded = await prisma.chat.findUnique({
    where: { id: chat.id },
    include: {
      members: true,
      messages: { include: { reads: true } },
    },
  });

  if (loaded === null || loaded.messages.length === 0 || loaded.members.length === 0) {
    throw new Error("Failed to read persisted chat data");
  }

  await prisma.chat.delete({ where: { id: chat.id } });

  const deleted = await prisma.chat.findUnique({ where: { id: chat.id } });
  if (deleted !== null) {
    throw new Error("Cascade delete did not remove test chat");
  }

  console.log("Persistence OK: chat, member, message, and message_read records verified");
}

async function main(): Promise<void> {
  await verifyTablesExist();
  await verifyPersistence();
  console.log("Database verification passed");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown verification error";
    console.error(`Database verification failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
