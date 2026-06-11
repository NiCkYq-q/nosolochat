let sessionReady = false;

export function isNotificationSessionReady(): boolean {
  return sessionReady;
}

export function setNotificationSessionReady(value: boolean): void {
  sessionReady = value;
}

export function resetNotificationSessionReady(): void {
  sessionReady = false;
}
