export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
};

export type AuthResult = {
  user: AuthUser;
  token: string;
};

export type RegisterInput = {
  username: unknown;
  email: unknown;
  password: unknown;
};

export type LoginInput = {
  username: unknown;
  password: unknown;
};
