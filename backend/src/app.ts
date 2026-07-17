import cors from "cors";
import express from "express";
import helmet from "helmet";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { me } from "./modules/auth/auth.controller";
import { mediaRouter } from "./modules/media/media.routes";
import { walletRouter } from "./modules/wallet/wallet.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.get("/api/me", requireAuth, me);
  app.use("/api/wallet", walletRouter);
  app.use("/api/media", mediaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
