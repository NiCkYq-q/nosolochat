export type ChatListItem = {
  id: number;
  type: "private" | "group";
  name: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline: boolean;
  notificationsEnabled: boolean;
};
