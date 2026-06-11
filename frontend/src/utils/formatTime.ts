function parseDate(isoDate: string | null): Date | null {
  if (isoDate === null) {
    return null;
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getLocalDateKey(isoDate: string): string {
  const date = parseDate(isoDate);
  if (date === null) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
}

export function formatMessageTime(isoDate: string | null): string {
  const date = parseDate(isoDate);
  if (date === null) {
    return "";
  }

  const now = new Date();
  const today = startOfLocalDay(now);
  const messageDay = startOfLocalDay(date);
  const time = formatClockTime(date);

  if (messageDay.getTime() === today.getTime()) {
    return time;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDay.getTime() === yesterday.getTime()) {
    return `Вчера, ${time}`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}, ${time}`;
}

export function formatFloatingDate(isoDate: string): string {
  const date = parseDate(isoDate);
  if (date === null) {
    return "";
  }

  const now = new Date();
  const today = startOfLocalDay(now);
  const messageDay = startOfLocalDay(date);

  if (messageDay.getTime() === today.getTime()) {
    return "Сегодня";
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDay.getTime() === yesterday.getTime()) {
    return "Вчера";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Keep chat list time formatting separate from message bubble time.
export function formatChatListTime(isoDate: string | null): string {
  const date = parseDate(isoDate);
  if (date === null) {
    return "";
  }

  return formatClockTime(date);
}
