import nodemailer from "nodemailer";
import { getEnv } from "../config/env.js";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  if (host === undefined || host === "") {
    return null;
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  };
}

export async function sendPasswordResetEmail(
  to: string,
  username: string,
  resetUrl: string
): Promise<void> {
  const smtp = getSmtpConfig();
  const from = process.env.SMTP_FROM ?? "NoSoloChat <no-reply@nosolo.local>";

  const html = `
    <p>Здравствуйте, ${username}!</p>
    <p>Вы запросили восстановление пароля.</p>
    <p><a href="${resetUrl}">Сбросить пароль</a></p>
    <p>Ссылка действительна 15 минут.</p>
    <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
  `;

  if (smtp === null) {
    console.log(`[email] Password reset for ${to}: ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport(smtp);
  await transporter.sendMail({
    from,
    to,
    subject: "Восстановление пароля",
    html,
  });
}

export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL ?? getEnv("CORS_ORIGIN", "http://localhost:5173");
}
