import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getTransactionHistory, getWalletBalance } from "./wallet.service";

export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  const balance = await getWalletBalance(req.userId!);
  res.json({ balance });
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));
  const result = await getTransactionHistory(req.userId!, page, pageSize);
  res.json(result);
});
