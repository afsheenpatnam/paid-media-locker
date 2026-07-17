import { Request, Response } from "express";
import { NotFoundError } from "../../utils/errors";
import { asyncHandler } from "../../utils/asyncHandler";
import { getUserById, loginUser, registerUser } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schemas";

function serializeUser(user: { id: string; email: string; displayName: string; walletBalance: number; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    walletBalance: user.walletBalance,
    createdAt: user.createdAt,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const { token, user } = await registerUser(input);
  res.status(201).json({ token, user: serializeUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { token, user } = await loginUser(input);
  res.json({ token, user: serializeUser(user) });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserById(req.userId!);
  if (!user) throw new NotFoundError("User not found");
  res.json({ user: serializeUser(user) });
});
