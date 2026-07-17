import bcrypt from "bcryptjs";
import { prisma } from "../../db/client";
import { env } from "../../config/env";
import { ConflictError, UnauthorizedError } from "../../utils/errors";
import { signAuthToken } from "../../utils/jwt";
import { LoginInput, RegisterInput } from "./auth.schemas";

const SALT_ROUNDS = 10;

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        walletBalance: env.startingWalletBalance,
      },
    });

    await tx.transaction.create({
      data: {
        userId: created.id,
        type: "SEED",
        amount: env.startingWalletBalance,
        balanceAfter: env.startingWalletBalance,
      },
    });

    return created;
  });

  const token = signAuthToken({ userId: user.id });
  return { token, user };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const token = signAuthToken({ userId: user.id });
  return { token, user };
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}
