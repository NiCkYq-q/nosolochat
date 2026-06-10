import type { Response } from "express";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
};

export function sendSuccess(res: Response, data: unknown, status = 200): void {
  const body: ApiSuccessResponse<unknown> = { success: true, data };
  res.status(status).json(body);
}

export function sendError(res: Response, message: string, status = 400): void {
  const body: ApiErrorResponse = { success: false, message };
  res.status(status).json(body);
}
