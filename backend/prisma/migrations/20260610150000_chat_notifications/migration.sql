-- AlterTable ChatMember: per-user notification preference
ALTER TABLE "ChatMember" ADD COLUMN "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
