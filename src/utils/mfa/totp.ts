import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export const base32Encode = (buf: Buffer) => {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32[(value << (5 - bits)) & 31];
  }
  return out;
};

export const base32Decode = (input: string) => {
  const clean = input.toUpperCase().replace(/[\s=]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 character");
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

export const generateTotpSecret = () => base32Encode(randomBytes(20));

export const currentTotpStep = (now = Date.now()) =>
  Math.floor(now / 1000 / STEP_SECONDS);

export const totpCode = (secret: string, step: number) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret))
    .update(counter)
    .digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
};

export const matchTotpStep = (
  secret: string,
  code: string,
  lastUsedStep: number | null,
  now = Date.now()
): number | null => {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return null;
  }
  const current = currentTotpStep(now);
  for (const step of [current - 1, current, current + 1]) {
    if (lastUsedStep !== null && step <= lastUsedStep) {
      continue;
    }
    if (
      timingSafeEqual(
        Buffer.from(totpCode(secret, step)),
        Buffer.from(normalized)
      )
    ) {
      return step;
    }
  }
  return null;
};

export const totpUri = (secret: string, account: string, issuer: string) => {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params}`;
};
