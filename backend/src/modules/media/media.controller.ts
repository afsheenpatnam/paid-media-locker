import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { logAudit } from "../../utils/auditLogger";
import { BadRequestError } from "../../utils/errors";
import { createOriginalAccessToken, verifyOriginalAccessToken } from "../../utils/signedUrl";
import { uploadMediaSchema } from "./media.schemas";
import {
  createMedia,
  getMediaDetails,
  getOriginalFile,
  getPreviewFile,
  listFeed,
  unlockMedia,
} from "./media.service";

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new BadRequestError("An image file is required (field name 'image')");
  const input = uploadMediaSchema.parse(req.body);
  const media = await createMedia(req.userId!, req.file, input);
  res.status(201).json({ media: { id: media.id, title: media.title, unlockPrice: media.unlockPrice } });
});

export const feed = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)));
  const result = await listFeed(req.userId!, page, pageSize);
  res.json(result);
});

export const details = asyncHandler(async (req: Request, res: Response) => {
  const media = await getMediaDetails(req.params.id, req.userId!);
  const response: Record<string, unknown> = { media };
  if (!media.locked) {
    const token = createOriginalAccessToken(media.id, req.userId!);
    response.originalUrl = `/api/media/${media.id}/original?token=${token}`;
  }
  res.json(response);
});

export const preview = asyncHandler(async (req: Request, res: Response) => {
  const { buffer, mimeType } = await getPreviewFile(req.params.id);
  res.setHeader("Cache-Control", "private, max-age=60");
  res.contentType(mimeType);
  res.send(buffer);
});

export const original = asyncHandler(async (req: Request, res: Response) => {
  const token = String(req.query.token ?? "");
  const verification = verifyOriginalAccessToken(token, req.params.id, req.userId!);
  if (!verification.valid) {
    await logAudit({ userId: req.userId, mediaId: req.params.id, action: "ORIGINAL_ACCESS_DENIED", req });
    throw new BadRequestError(`Invalid access token (${verification.reason ?? "unknown"})`);
  }
  // The token only bounds replay time; entitlement is re-checked server-side here.
  const { buffer, mimeType } = await getOriginalFile(req.params.id, req.userId!, req);
  res.setHeader("Cache-Control", "no-store");
  res.contentType(mimeType);
  res.send(buffer);
});

export const unlock = asyncHandler(async (req: Request, res: Response) => {
  const result = await unlockMedia(req.params.id, req.userId!, req);
  res.status(200).json({ purchaseId: result.purchase.id, walletBalance: result.balance });
});
