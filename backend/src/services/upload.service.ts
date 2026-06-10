import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ChatType } from "@prisma/client";
import { requireChatMember } from "../lib/chat-access.js";
import { prisma } from "../lib/prisma.js";
import { isBlocked } from "./block.service.js";
import { restoreHiddenChatsForNewMessage, type RestoredChatInfo } from "./chat.service.js";
import type { MessageDto } from "../types/message.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
]);

export function getUploadsDir(): string {
  return path.resolve(process.cwd(), "uploads");
}

export function validateImageFile(
  file: Express.Multer.File | undefined
): { ok: true; extension: string } | { ok: false; message: string } {
  if (file === undefined) {
    return { ok: false, message: "Файл не выбран" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, message: "Файл слишком большой. Максимум 5 MB" };
  }

  const extension = ALLOWED_MIME_TYPES.get(file.mimetype);
  if (extension === undefined) {
    return { ok: false, message: "Допустимы только изображения (JPEG, PNG, GIF, WebP)" };
  }

  return { ok: true, extension };
}

export type UploadImageResult = {
  message: MessageDto;
  restoredChats: RestoredChatInfo[];
};

export async function uploadChatImage(
  chatId: number,
  senderId: number,
  file: Express.Multer.File | undefined
): Promise<UploadImageResult | { error: string; status: number }> {
  const validation = validateImageFile(file);
  if (!validation.ok) {
    return { error: validation.message, status: 400 };
  }

  const uploadFile = file as Express.Multer.File;

  const membership = await requireChatMember(chatId, senderId);
  if (membership === null) {
    return { error: "Chat not found", status: 404 };
  }

  const chat = membership.chat;

  if (chat.type === ChatType.private) {
    const partner = chat.members.find((member) => member.userId !== senderId);
    if (partner !== undefined && (await isBlocked(partner.userId, senderId))) {
      return { error: "Вас добавили в чёрный список", status: 403 };
    }
  }

  const uploadsDir = getUploadsDir();
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${randomUUID()}${validation.extension}`;
  const absolutePath = path.join(uploadsDir, filename);
  await writeFile(absolutePath, uploadFile.buffer);

  const imageUrl = `/uploads/${filename}`;
  const now = new Date();
  const members = chat.members;

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId,
      content: null,
      imageUrl,
      reads: {
        create: members.map((member) => ({
          userId: member.userId,
          readAt: member.userId === senderId ? now : null,
        })),
      },
    },
    select: {
      id: true,
      senderId: true,
      content: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  const restoredChats = await restoreHiddenChatsForNewMessage(chatId, senderId);

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { username: true },
  });

  return {
    message: {
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt.toISOString(),
      senderUsername: chat.type === ChatType.group ? sender?.username : undefined,
    },
    restoredChats,
  };
}
