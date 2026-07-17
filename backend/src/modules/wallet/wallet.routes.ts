import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { getTransactions, getWallet } from "./wallet.controller";

const router = Router();

router.get("/", requireAuth, getWallet);
router.get("/transactions", requireAuth, getTransactions);

export const walletRouter = router;
