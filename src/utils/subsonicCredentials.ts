import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import prisma from "@mirlo/prisma";

export type SubsonicCredentialView = {
  username: string;
  password: string;
  serverUrl: string;
};

// 10: required parameter missing, 40: wrong username or password,
// 43: apiKey sent together with another credential, 44: unknown apiKey
export type SubsonicAuthError = 10 | 40 | 43 | 44;

type Params = Record<string, string | undefined>;

// Nine digits at most, so the id always fits the Int column
const USERNAME_PATTERN = /^mirlo-(\d{1,9})$/;

export const subsonicUsername = (userId: number) => `mirlo-${userId}`;

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

// Token auth hashes the plaintext password, so the secret has to be recoverable
const encryptionKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable must be set");
  }
  return Buffer.from(
    hkdfSync("sha256", secret, "", "subsonic-credentials", 32)
  );
};

// Stored as base64url(iv).base64url(authTag).base64url(ciphertext)
const encrypt = (plaintext: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
};

const decrypt = (stored: string, key: Buffer) => {
  const [iv, authTag, ciphertext] = stored
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
};

// Returns undefined for a secret sealed under a rotated JWT_SECRET, which
// counts as no credential, and still throws when JWT_SECRET is missing
const tryDecrypt = (stored: string) => {
  const key = encryptionKey();
  try {
    return decrypt(stored, key);
  } catch {
    return undefined;
  }
};

const sameString = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

// A salted token when both t and s came in, else the password as sent or as
// "enc:" followed by its hex encoding
const proofMatches = (secret: string, { p = "", t, s }: Params) => {
  if (t && s) {
    return sameString(
      t,
      createHash("md5")
        .update(secret + s)
        .digest("hex")
    );
  }
  return sameString(
    p.startsWith("enc:") ? Buffer.from(p.slice(4), "hex").toString("utf8") : p,
    secret
  );
};

const findActiveCredential = async (
  where: { userId: number } | { secretHash: string }
) => {
  const credential = await prisma.subsonicCredential.findUnique({
    where,
    include: { user: { select: { disabledAt: true } } },
  });
  // Deleting an account removes its credential, so only disabling needs a check
  return credential && !credential.user.disabledAt ? credential : null;
};

const toView = (userId: number, password: string): SubsonicCredentialView => ({
  username: subsonicUsername(userId),
  password,
  serverUrl: `${process.env.API_DOMAIN}/subsonic`,
});

export const getSubsonicCredential = async (userId: number) => {
  const credential = await prisma.subsonicCredential.findUnique({
    where: { userId },
  });
  const password = credential && tryDecrypt(credential.secret);
  return password ? toView(userId, password) : null;
};

export const createSubsonicCredential = async (userId: number) => {
  const password = randomBytes(16).toString("hex");
  const data = { secret: encrypt(password), secretHash: sha256(password) };
  await prisma.subsonicCredential.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return toView(userId, password);
};

export const deleteSubsonicCredential = async (userId: number) => {
  const { count } = await prisma.subsonicCredential.deleteMany({
    where: { userId },
  });
  return count > 0;
};

export const authenticateSubsonic = async (
  params: Params
): Promise<{ userId: number } | { error: SubsonicAuthError }> => {
  const { u, p, t, s, apiKey } = params;

  if (apiKey) {
    if (u || p || t || s) {
      return { error: 43 };
    }
    const credential = await findActiveCredential({
      secretHash: sha256(apiKey),
    });
    return credential ? { userId: credential.userId } : { error: 44 };
  }

  if (!u || !(p || (t && s))) {
    return { error: 10 };
  }

  const id = USERNAME_PATTERN.exec(u)?.[1];
  const credential = id
    ? await findActiveCredential({ userId: Number(id) })
    : null;
  const secret = credential && tryDecrypt(credential.secret);
  if (!credential || !secret || !proofMatches(secret, params)) {
    return { error: 40 };
  }
  return { userId: credential.userId };
};
