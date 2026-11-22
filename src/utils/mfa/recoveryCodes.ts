import { createHash, randomBytes } from "node:crypto";

import prisma from "@mirlo/prisma";

import { base32Encode } from "./totp";

const CODE_COUNT = 10;

const normalize = (code: string) =>
  code.toLowerCase().replace(/[^a-z2-7]/g, "");

const hashCode = (code: string) =>
  createHash("sha256").update(normalize(code)).digest("hex");

const newCode = () =>
  base32Encode(randomBytes(10)).toLowerCase().match(/.{4}/g)!.join("-");

export const replaceRecoveryCodes = async (userId: number) => {
  const codes = Array.from({ length: CODE_COUNT }, newCode);
  await prisma.$transaction([
    prisma.userRecoveryCode.deleteMany({ where: { userId } }),
    prisma.userRecoveryCode.createMany({
      data: codes.map((code) => ({ userId, codeHash: hashCode(code) })),
    }),
  ]);
  return codes;
};

export const redeemRecoveryCode = async (userId: number, code: string) => {
  if (normalize(code).length !== 16) {
    return false;
  }
  const { count } = await prisma.userRecoveryCode.updateMany({
    where: { userId, codeHash: hashCode(code), usedAt: null },
    data: { usedAt: new Date() },
  });
  return count === 1;
};

export const countRecoveryCodes = (userId: number) =>
  prisma.userRecoveryCode.count({ where: { userId, usedAt: null } });
