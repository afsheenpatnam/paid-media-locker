import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../utils/errors";
import { verifyAuthToken } from "../utils/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing bearer token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}
