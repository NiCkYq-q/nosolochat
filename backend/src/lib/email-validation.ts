const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: unknown): { ok: true; email: string } | { ok: false; message: string } {
  if (typeof email !== "string") {
    return { ok: false, message: "Email обязателен" };
  }

  const normalized = email.trim().toLowerCase();

  if (normalized.length === 0) {
    return { ok: false, message: "Email обязателен" };
  }

  if (!EMAIL_REGEX.test(normalized)) {
    return { ok: false, message: "Неверный email" };
  }

  return { ok: true, email: normalized };
}
