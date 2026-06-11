export function formatTypingIndicatorText(users: string[]): string | null {
  if (users.length === 0) {
    return null;
  }

  if (users.length === 1) {
    return `${users[0]} печатает`;
  }

  if (users.length === 2) {
    return `${users[0]} и ${users[1]} печатают`;
  }

  return `${users[0]} и ${users[1]} и ещё ${String(users.length - 2)} печатают`;
}
