import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { HttpError } from "../utils/errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "validation_error", details: err.flatten() });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({
    error: "internal_error",
    ...(env.nodeEnv !== "production" && err instanceof Error ? { message: err.message } : {}),
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "not_found" });
}
