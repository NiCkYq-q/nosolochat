import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { readCredentialFields } from "../lib/request.js";
import { sendError, sendSuccess } from "../lib/response.js";
import { getCurrentUser, loginUser, registerUser } from "../services/auth.service.js";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "../services/password-reset.service.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const body = req.body as unknown;
  const credentials = readCredentialFields(body);
  const email =
    typeof body === "object" && body !== null && "email" in body ? body.email : undefined;

  const result = await registerUser({
    username: credentials.username,
    email,
    password: credentials.password,
  });

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, result, 201);
});

authRouter.post("/login", async (req, res) => {
  const credentials = readCredentialFields(req.body);
  const result = await loginUser({
    username: credentials.username,
    password: credentials.password,
  });

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, result);
});

authRouter.post("/forgot-password", async (req, res) => {
  const body = req.body as unknown;
  const email =
    typeof body === "object" && body !== null && "email" in body ? body.email : undefined;

  const result = await requestPasswordReset(email);
  sendSuccess(res, { message: result.message });
});

authRouter.post("/reset-password", async (req, res) => {
  const body = req.body as unknown;
  const token =
    typeof body === "object" && body !== null && "token" in body ? body.token : undefined;
  const newPassword =
    typeof body === "object" && body !== null && "newPassword" in body
      ? body.newPassword
      : undefined;

  const result = await resetPasswordWithToken(token, newPassword);

  if ("error" in result) {
    sendError(res, result.error, result.status);
    return;
  }

  sendSuccess(res, { message: "Пароль успешно изменён" });
});

authRouter.get("/me", authenticate, async (req, res) => {
  const auth = req.auth;
  if (auth === undefined) {
    sendError(res, "Authentication required", 401);
    return;
  }

  const user = await getCurrentUser(auth.userId);
  if (user === null) {
    sendError(res, "User not found", 404);
    return;
  }

  sendSuccess(res, user);
});
