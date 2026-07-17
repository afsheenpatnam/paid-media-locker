import { AuditAction } from "@prisma/client";
import { Request } from "express";
import { prisma } from "../db/client";

export async function logAudit(params: {
  userId?: string | null;
  mediaId?: string | null;
  action: AuditAction;
  req?: Request;
}) {
  // Audit logging is best-effort: it must never break the primary request
  // (e.g. a mediaId that doesn't reference a real row would otherwise trip
  // the AuditLog FK constraint and turn a 400/404 into a 500).
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        mediaId: params.mediaId ?? null,
        action: params.action,
        ip: params.req?.ip ?? null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to write audit log entry", params.action, err);
  }
}
