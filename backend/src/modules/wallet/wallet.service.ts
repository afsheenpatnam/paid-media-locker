import { prisma } from "../../db/client";

export async function getWalletBalance(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return user.walletBalance;
}

export async function getTransactionHistory(userId: string, page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where: { userId } }),
  ]);
  return { items, total, page, pageSize };
}
