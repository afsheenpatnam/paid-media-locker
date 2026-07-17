import crypto from "crypto";
import { env } from "../config/env";

// Short-lived HMAC-signed token bound to a specific (mediaId, userId) pair.
// This is defense-in-depth on top of the real gate, which is the server-side
// ownership/purchase check performed on every original-file request. The token
// only limits how long a captured/shared URL keeps working.
interface TokenParts {
  mediaId: string;
  userId: string;
  expiresAt: number;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.signedUrlSecret).update(payload).digest("base64url");
}

export function createOriginalAccessToken(mediaId: string, userId: string): string {
  const expiresAt = Date.now() + env.signedUrlTtlSeconds * 1000;
  const payload = `${mediaId}.${userId}.${expiresAt}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyOriginalAccessToken(
  token: string,
  mediaId: string,
  userId: string
): { valid: boolean; reason?: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 4) return { valid: false, reason: "malformed_token" };
    const [tokenMediaId, tokenUserId, expiresAtStr, signature] = parts;
    const payload = `${tokenMediaId}.${tokenUserId}.${expiresAtStr}`;
    const expectedSignature = sign(payload);

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, reason: "bad_signature" };
    }
    if (tokenMediaId !== mediaId || tokenUserId !== userId) {
      return { valid: false, reason: "token_mismatch" };
    }
    const expiresAt: TokenParts["expiresAt"] = Number(expiresAtStr);
    if (Date.now() > expiresAt) {
      return { valid: false, reason: "expired" };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "malformed_token" };
  }
}
