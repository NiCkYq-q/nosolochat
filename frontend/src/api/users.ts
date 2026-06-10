import { apiRequest } from "./client";

export type SearchUser = {
  id: number;
  username: string;
};

export type UserStatus = {
  isOnline: boolean;
  lastSeen: string | null;
};

export async function searchUsers(query: string): Promise<SearchUser[]> {
  const params = new URLSearchParams({ q: query });
  return apiRequest<SearchUser[]>(`/api/users/search?${params.toString()}`);
}

export async function fetchUserStatus(userId: number): Promise<UserStatus> {
  return apiRequest<UserStatus>(`/api/users/${String(userId)}/status`);
}

export async function blockUser(userId: number): Promise<null> {
  return apiRequest<null>(`/api/users/${String(userId)}/block`, { method: "POST" });
}

export async function unblockUser(userId: number): Promise<null> {
  return apiRequest<null>(`/api/users/${String(userId)}/block`, { method: "DELETE" });
}
