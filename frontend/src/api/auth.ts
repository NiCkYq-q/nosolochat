import { apiRequest } from "./client";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
};

export type AuthPayload = {
  user: AuthUser;
  token: string;
};

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthPayload> {
  return apiRequest<AuthPayload>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    },
    false
  );
}

export async function login(username: string, password: string): Promise<AuthPayload> {
  return apiRequest<AuthPayload>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    false
  );
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/auth/me");
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    "/api/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    false
  );
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    "/api/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    },
    false
  );
}
