import { prisma } from "../src/db/client";

export async function resetDb() {
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.media.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
