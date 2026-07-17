import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { Request } from "express";
import { prisma } from "../../db/client";
import { storageService } from "../../storage/LocalDiskStorage";
import { generatePreview } from "../../utils/imageProcessing";
import { logAudit } from "../../utils/auditLogger";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { UploadMediaInput } from "./media.schemas";

export async function createMedia(
  ownerId: string,
  file: Express.Multer.File,
  input: UploadMediaInput
) {
  const ext = file.mimetype === "image/png" ? "png" : "jpg";
  const originalKey = `${randomUUID()}.${ext}`;
  const previewKey = `${randomUUID()}.jpg`;

  const previewBuffer = await generatePreview(file.buffer);

  await storageService.saveOriginal(originalKey, file.buffer);
  await storageService.savePreview(previewKey, previewBuffer);

  return prisma.media.create({
    data: {
      ownerId,
      title: input.title,
      description: input.description,
      unlockPrice: input.unlockPrice,
      originalKey,
      previewKey,
      mimeType: file.mimetype,
    },
  });
}

export async function listFeed(userId: string, page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        purchases: { where: { userId }, select: { id: true } },
      },
    }),
    prisma.media.count(),
  ]);

  const serialized = items.map((m) => ({
    id: m.id,
    ownerId: m.ownerId,
    title: m.title,
    description: m.description,
    unlockPrice: m.unlockPrice,
    createdAt: m.createdAt,
    locked: m.ownerId !== userId && m.purchases.length === 0,
    previewUrl: `/api/media/${m.id}/preview`,
  }));

  return { items: serialized, total, page, pageSize };
}

async function isEntitled(mediaId: string, userId: string): Promise<boolean> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new NotFoundError("Media not found");
  if (media.ownerId === userId) return true;
  const purchase = await prisma.purchase.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  });
  return purchase !== null;
}

export async function getMediaDetails(mediaId: string, userId: string) {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new NotFoundError("Media not found");

  const unlocked = await isEntitled(mediaId, userId);

  return {
    id: media.id,
    ownerId: media.ownerId,
    title: media.title,
    description: media.description,
    unlockPrice: media.unlockPrice,
    createdAt: media.createdAt,
    locked: !unlocked,
    previewUrl: `/api/media/${media.id}/preview`,
  };
}

export async function getPreviewFile(mediaId: string) {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new NotFoundError("Media not found");
  const buffer = await storageService.readPreview(media.previewKey);
  return { buffer, mimeType: "image/jpeg" };
}

export async function getOriginalFile(mediaId: string, userId: string, req: Request) {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new NotFoundError("Media not found");

  const unlocked = await isEntitled(mediaId, userId);
  if (!unlocked) {
    await logAudit({ userId, mediaId, action: "ORIGINAL_ACCESS_DENIED", req });
    throw new ForbiddenError("You have not unlocked this media");
  }

  await logAudit({ userId, mediaId, action: "ORIGINAL_ACCESS_GRANTED", req });
  const buffer = await storageService.readOriginal(media.originalKey);
  return { buffer, mimeType: media.mimeType };
}

export async function unlockMedia(mediaId: string, userId: string, req: Request) {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) {
    // mediaId doesn't reference a real row, so it can't be attached to the
    // audit log (FK constraint) -- log the attempt without it.
    await logAudit({ userId, action: "UNLOCK_FAIL_NOT_FOUND", req });
    throw new NotFoundError("Media not found");
  }

  if (media.ownerId === userId) {
    throw new BadRequestError("You already own this media");
  }

  const existingPurchase = await prisma.purchase.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  });
  if (existingPurchase) {
    await logAudit({ userId, mediaId, action: "UNLOCK_FAIL_ALREADY_OWNED", req });
    throw new ConflictError("Media already unlocked");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.walletBalance < media.unlockPrice) {
    await logAudit({ userId, mediaId, action: "UNLOCK_FAIL_INSUFFICIENT_BALANCE", req });
    throw new BadRequestError("Insufficient wallet balance");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: media.unlockPrice } },
      });

      const purchase = await tx.purchase.create({
        data: { userId, mediaId, pricePaid: media.unlockPrice },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "DEBIT",
          amount: media.unlockPrice,
          balanceAfter: updatedUser.walletBalance,
          relatedPurchaseId: purchase.id,
        },
      });

      return { purchase, balance: updatedUser.walletBalance };
    });

    await logAudit({ userId, mediaId, action: "UNLOCK_SUCCESS", req });
    return result;
  } catch (err) {
    // Unique constraint on (userId, mediaId) is the hard backstop against a
    // race where two concurrent unlock requests both pass the check above.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await logAudit({ userId, mediaId, action: "UNLOCK_FAIL_ALREADY_OWNED", req });
      throw new ConflictError("Media already unlocked");
    }
    throw err;
  }
}
