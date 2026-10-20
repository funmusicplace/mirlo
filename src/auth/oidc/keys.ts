import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import type { JWKS } from "oidc-provider";

const loadOrCreate = async <T>(kind: string, create: () => T): Promise<T> => {
  const existing = await prisma.oAuthKey.findUnique({ where: { kind } });
  if (existing) {
    return existing.value as T;
  }
  await prisma.oAuthKey.createMany({
    data: [{ kind, value: create() as Prisma.InputJsonValue }],
    skipDuplicates: true,
  });
  const { value } = await prisma.oAuthKey.findUniqueOrThrow({
    where: { kind },
  });
  return value as T;
};

const generateSigningKey = () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    ...privateKey.export({ format: "jwk" }),
    kid: randomUUID(),
    alg: "RS256",
    use: "sig",
  };
};

export const loadKeys = async () => ({
  jwks: await loadOrCreate<JWKS>("jwks", () => ({
    keys: [generateSigningKey()],
  })),
  cookieKeys: await loadOrCreate<string[]>("cookies", () => [
    randomBytes(32).toString("base64url"),
  ]),
});
