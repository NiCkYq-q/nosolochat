import { apiRequest } from "./client";

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

export type CreatePrivateChatResult =
  | { chatId: number; existing?: boolean }
  | { inviteId: number; pending: true };

export type ChatDetails = {
  id: number;
  type: "private" | "group";
  name: string;
  participants: Array<{ id: number; username: string }>;
  isBlockedByMe: boolean;
  isBlockedByPartner: boolean;
  notificationsEnabled: boolean;
};

export async function fetchChats(): Promise<ChatListItem[]> {
  return apiRequest<ChatListItem[]>("/api/chats");
}

export async function fetchChatDetails(chatId: number): Promise<ChatDetails> {
  return apiRequest<ChatDetails>(`/api/chats/${String(chatId)}`);
}

export async function markChatAsRead(chatId: number): Promise<null> {
  return apiRequest<null>(`/api/chats/${String(chatId)}/read`, { method: "POST" });
}

export async function createPrivateChat(userId: number): Promise<CreatePrivateChatResult> {
  return apiRequest<CreatePrivateChatResult>("/api/chats/private", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export type CreateGroupChatResult = {
  chatId: number;
};

export async function createGroupChat(
  name: string,
  members: number[]
): Promise<CreateGroupChatResult> {
  return apiRequest<CreateGroupChatResult>("/api/chats/group", {
    method: "POST",
    body: JSON.stringify({ name, members }),
  });
}

export async function deleteChat(chatId: number): Promise<null> {
  return apiRequest<null>(`/api/chats/${String(chatId)}`, { method: "DELETE" });
}

export async function leaveGroup(chatId: number): Promise<null> {
  return apiRequest<null>(`/api/chats/${String(chatId)}/leave`, { method: "POST" });
}

export type InviteGroupMemberResult = {
  inviteId: number;
  pending: true;
};

export async function inviteUserToGroup(
  chatId: number,
  userId: number
): Promise<InviteGroupMemberResult> {
  return apiRequest<InviteGroupMemberResult>(`/api/chats/${String(chatId)}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function setChatNotifications(
  chatId: number,
  enabled: boolean
): Promise<{ notificationsEnabled: boolean }> {
  return apiRequest<{ notificationsEnabled: boolean }>(
    `/api/chats/${String(chatId)}/notifications`,
    {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }
  );
}
