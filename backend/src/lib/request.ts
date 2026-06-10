export function readCredentialFields(body: unknown): { username: unknown; password: unknown } {
  if (typeof body !== "object" || body === null) {
    return { username: undefined, password: undefined };
  }

  const record = body as Record<string, unknown>;
  return {
    username: record.username,
    password: record.password,
  };
}
