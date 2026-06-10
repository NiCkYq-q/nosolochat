import { apiRequest } from "./client";

export type Invite = {
  id: number;
  type: "private" | "group";
  fromUserId: number;
  fromUsername: string;
  chatId: number | null;
  groupName: string | null;
  createdAt: string;
};

export async function fetchInvites(): Promise<Invite[]> {
  return apiRequest<Invite[]>("/api/invites");
}

export async function acceptInvite(inviteId: number): Promise<{
  type: "private" | "group";
  chatId: number;
}> {
  return apiRequest(`/api/invites/${String(inviteId)}/accept`, { method: "POST" });
}

export async function rejectInvite(inviteId: number): Promise<null> {
  return apiRequest<null>(`/api/invites/${String(inviteId)}/reject`, { method: "POST" });
}
