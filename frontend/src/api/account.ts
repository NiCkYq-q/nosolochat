import { apiRequest } from "./client";

export async function deleteOwnAccount(password: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/users/me", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}
