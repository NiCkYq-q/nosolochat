const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 32;
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 128;

export type ValidationResult =
  | { ok: true; username: string; password: string }
  | { ok: false; message: string };

export function validateCredentials(username: unknown, password: unknown): ValidationResult {
  if (typeof username !== "string" || typeof password !== "string") {
    return { ok: false, message: "Username and password are required" };
  }

  const normalizedUsername = username.trim();

  if (normalizedUsername.length < USERNAME_MIN_LENGTH) {
    return { ok: false, message: `Username must be at least ${String(USERNAME_MIN_LENGTH)} characters` };
  }

  if (normalizedUsername.length > USERNAME_MAX_LENGTH) {
    return { ok: false, message: `Username must be at most ${String(USERNAME_MAX_LENGTH)} characters` };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${String(PASSWORD_MIN_LENGTH)} characters` };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: `Password must be at most ${String(PASSWORD_MAX_LENGTH)} characters` };
  }

  return { ok: true, username: normalizedUsername, password };
}
