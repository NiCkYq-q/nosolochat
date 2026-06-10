const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 2000;

export type MessageValidationResult =
  | { ok: true; content: string }
  | { ok: false; message: string };

export function validateMessageContent(content: unknown): MessageValidationResult {
  if (typeof content !== "string") {
    return { ok: false, message: "Message content is required" };
  }

  const trimmed = content.trim();
  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return { ok: false, message: `Message must be at least ${String(MIN_MESSAGE_LENGTH)} character` };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: `Message must be at most ${String(MAX_MESSAGE_LENGTH)} characters`,
    };
  }

  return { ok: true, content: trimmed };
}
