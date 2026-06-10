import jwt, { type SignOptions } from "jsonwebtoken";
import { getEnv } from "../config/env.js";

export type JwtPayload = {
  userId: number;
  username: string;
};

export function signToken(payload: JwtPayload): string {
  const secret = getEnv("JWT_SECRET");
  const options: SignOptions = {
    expiresIn: getEnv("JWT_EXPIRES_IN", "7d") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string): JwtPayload {
  const secret = getEnv("JWT_SECRET");
  const decoded: unknown = jwt.verify(token, secret);

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const record = decoded as Record<string, unknown>;
  const { userId, username } = record;

  if (typeof userId !== "number" || typeof username !== "string") {
    throw new Error("Invalid token payload");
  }

  return { userId, username };
}
