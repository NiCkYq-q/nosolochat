const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function formatPresenceStatus(isOnline: boolean, lastSeen: string | null): string {
  if (isOnline) {
    return "В сети";
  }

  if (lastSeen !== null) {
    const lastSeenTime = new Date(lastSeen).getTime();
    if (Date.now() - lastSeenTime < RECENT_THRESHOLD_MS) {
      return "Был(а) недавно";
    }
  }

  return "Не в сети";
}
