import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import type { Adapter, AdapterPayload } from "oidc-provider";

import { clientMetadataFor } from "./clients";

const GRANTABLE = new Set([
  "AccessToken",
  "AuthorizationCode",
  "RefreshToken",
  "DeviceCode",
  "BackchannelAuthenticationRequest",
]);

const accountIdOf = (payload: AdapterPayload) => {
  const id = Number(payload.accountId ?? payload.session?.accountId);
  return Number.isInteger(id) ? id : null;
};

const notExpired = () => ({
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
});

const toPayload = (
  row: { payload: unknown; consumedAt: Date | null } | null
): AdapterPayload | undefined => {
  if (!row) {
    return undefined;
  }
  return {
    ...(row.payload as AdapterPayload),
    ...(row.consumedAt
      ? { consumed: Math.floor(row.consumedAt.getTime() / 1000) }
      : {}),
  };
};

export class PrismaAdapter implements Adapter {
  constructor(private model: string) {}

  async upsert(id: string, payload: AdapterPayload, expiresIn?: number) {
    const data = {
      payload: payload as Prisma.InputJsonValue,
      grantId: GRANTABLE.has(this.model) ? (payload.grantId ?? null) : null,
      uid: payload.uid ?? null,
      accountId: accountIdOf(payload),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    };
    await prisma.oAuthPayload.upsert({
      where: { model_id: { model: this.model, id } },
      create: { model: this.model, id, ...data },
      update: data,
    });
  }

  async find(id: string) {
    return toPayload(
      await prisma.oAuthPayload.findFirst({
        where: { model: this.model, id, ...notExpired() },
      })
    );
  }

  async findByUid(uid: string) {
    return toPayload(
      await prisma.oAuthPayload.findFirst({
        where: { model: this.model, uid, ...notExpired() },
      })
    );
  }

  async findByUserCode() {
    return undefined;
  }

  async consume(id: string) {
    await prisma.oAuthPayload.updateMany({
      where: { model: this.model, id },
      data: { consumedAt: new Date() },
    });
  }

  async destroy(id: string) {
    await prisma.oAuthPayload.deleteMany({ where: { model: this.model, id } });
  }

  async revokeByGrantId(grantId: string) {
    await prisma.oAuthPayload.deleteMany({ where: { grantId } });
  }
}

class ClientAdapter implements Adapter {
  async find(id: string) {
    return clientMetadataFor(id);
  }

  async upsert() {}
  async findByUid() {
    return undefined;
  }
  async findByUserCode() {
    return undefined;
  }
  async consume() {}
  async destroy() {}
  async revokeByGrantId() {}
}

export const adapterFor = (model: string): Adapter =>
  model === "Client" ? new ClientAdapter() : new PrismaAdapter(model);
