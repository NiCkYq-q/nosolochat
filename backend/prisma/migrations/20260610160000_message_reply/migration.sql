-- AlterTable
ALTER TABLE "Message" ADD COLUMN "replyToMessageId" INTEGER;

-- CreateIndex
CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");
