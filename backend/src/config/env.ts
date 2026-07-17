import dotenv from "dotenv";
import path from "path";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  signedUrlSecret: required("SIGNED_URL_SECRET"),
  signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_SECONDS ?? 90),
  startingWalletBalance: Number(process.env.STARTING_WALLET_BALANCE ?? 100),
  storageOriginalsDir: path.resolve(process.env.STORAGE_ORIGINALS_DIR ?? "./storage/originals"),
  storagePreviewsDir: path.resolve(process.env.STORAGE_PREVIEWS_DIR ?? "./storage/previews"),
  demoEmail: process.env.DEMO_EMAIL ?? "demo@lockerapp.test",
  demoPassword: process.env.DEMO_PASSWORD ?? "Demo@1234",
};
