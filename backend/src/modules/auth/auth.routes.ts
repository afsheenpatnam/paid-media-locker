import { Router } from "express";
import { authRateLimiter } from "../../middleware/rateLimit";
import { login, register } from "./auth.controller";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);

export const authRouter = router;
