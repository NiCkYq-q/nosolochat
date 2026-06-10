const revokedUserIds = new Set<number>();

export function revokeUserTokens(userId: number): void {
  revokedUserIds.add(userId);
}

export function isUserTokenRevoked(userId: number): boolean {
  return revokedUserIds.has(userId);
}
