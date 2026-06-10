-- CreateTable
CREATE TABLE "MessageReplyTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" INTEGER NOT NULL,
    "targetMessageId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MessageReplyTarget_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageReplyTarget_targetMessageId_fkey" FOREIGN KEY ("targetMessageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing single replies
INSERT INTO "MessageReplyTarget" ("messageId", "targetMessageId", "sortOrder")
SELECT "id", "replyToMessageId", 0 FROM "Message" WHERE "replyToMessageId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MessageReplyTarget_messageId_targetMessageId_key" ON "MessageReplyTarget"("messageId", "targetMessageId");
CREATE INDEX "MessageReplyTarget_messageId_idx" ON "MessageReplyTarget"("messageId");

-- DropIndex
DROP INDEX "Message_replyToMessageId_idx";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chatId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("id", "chatId", "senderId", "content", "imageUrl", "createdAt") SELECT "id", "chatId", "senderId", "content", "imageUrl", "createdAt" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
