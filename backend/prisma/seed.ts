import bcrypt from "bcryptjs";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { prisma } from "../src/db/client";
import { env } from "../src/config/env";
import { storageService } from "../src/storage/LocalDiskStorage";
import { generatePreview } from "../src/utils/imageProcessing";

async function makeSampleImage(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer();
}

async function seedMedia(ownerId: string, title: string, price: number, color: { r: number; g: number; b: number }) {
  const original = await makeSampleImage(color);
  const preview = await generatePreview(original);
  const originalKey = `${randomUUID()}.jpg`;
  const previewKey = `${randomUUID()}.jpg`;
  await storageService.saveOriginal(originalKey, original);
  await storageService.savePreview(previewKey, preview);

  await prisma.media.create({
    data: {
      ownerId,
      title,
      description: `Sample seeded media: ${title}`,
      unlockPrice: price,
      originalKey,
      previewKey,
      mimeType: "image/jpeg",
    },
  });
}

async function main() {
  const demoPasswordHash = await bcrypt.hash(env.demoPassword, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: env.demoEmail },
    update: {},
    create: {
      email: env.demoEmail,
      passwordHash: demoPasswordHash,
      displayName: "Demo User",
      walletBalance: env.startingWalletBalance,
    },
  });

  const creatorPasswordHash = await bcrypt.hash("Creator@1234", 10);
  const creatorUser = await prisma.user.upsert({
    where: { email: "creator@lockerapp.test" },
    update: {},
    create: {
      email: "creator@lockerapp.test",
      passwordHash: creatorPasswordHash,
      displayName: "Sample Creator",
      walletBalance: env.startingWalletBalance,
    },
  });

  const existingMedia = await prisma.media.count({ where: { ownerId: creatorUser.id } });
  if (existingMedia === 0) {
    await seedMedia(creatorUser.id, "Sunset Ridge", 25, { r: 240, g: 140, b: 60 });
    await seedMedia(creatorUser.id, "Blue Lagoon", 40, { r: 40, g: 110, b: 200 });
    await seedMedia(creatorUser.id, "Forest Path", 15, { r: 50, g: 140, b: 70 });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log(`Demo login -> email: ${env.demoEmail}  password: ${env.demoPassword}`);
  // eslint-disable-next-line no-console
  console.log(`Creator login -> email: creator@lockerapp.test  password: Creator@1234`);
  // eslint-disable-next-line no-console
  console.log(`Demo user id: ${demoUser.id}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
