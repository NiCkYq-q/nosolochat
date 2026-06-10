import { apiRequest } from "./client";

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  lastSeen: string | null;
  isOnline: boolean;
};

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>("/api/admin/users");
}

export async function deleteUserByAdmin(userId: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/admin/users/${String(userId)}`, {
    method: "DELETE",
  });
}
