import assert from "assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
dotenv.config();

import { PrismaAdapter } from "../../../src/auth/oidc/adapter";
import cleanUpOAuthPayloads from "../../../src/jobs/tasks/clean-up-oauth-payloads";
import { clearTables } from "../../utils";

describe("oidc PrismaAdapter", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("stores, finds, consumes and destroys a payload", async () => {
    const adapter = new PrismaAdapter("AuthorizationCode");
    await adapter.upsert("code-1", { accountId: "7", grantId: "g1" }, 60);

    const found = await adapter.find("code-1");
    assert.equal(found?.accountId, "7");
    assert.equal(found?.consumed, undefined);

    const row = await prisma.oAuthPayload.findFirstOrThrow({
      where: { id: "code-1" },
    });
    assert.equal(row.accountId, 7);
    assert.equal(row.grantId, "g1");

    await adapter.consume("code-1");
    assert.ok((await adapter.find("code-1"))?.consumed);

    await adapter.destroy("code-1");
    assert.equal(await adapter.find("code-1"), undefined);
  });

  it("keeps models apart", async () => {
    await new PrismaAdapter("AccessToken").upsert("same", { scope: "a" }, 60);
    await new PrismaAdapter("RefreshToken").upsert("same", { scope: "b" }, 60);

    assert.equal(
      (await new PrismaAdapter("AccessToken").find("same"))?.scope,
      "a"
    );
  });

  it("doesn't return expired payloads", async () => {
    const adapter = new PrismaAdapter("AccessToken");
    await adapter.upsert("old", { accountId: "1" }, 60);
    await prisma.oAuthPayload.updateMany({
      where: { id: "old" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal(await adapter.find("old"), undefined);
  });

  it("finds sessions by uid", async () => {
    const adapter = new PrismaAdapter("Session");
    await adapter.upsert("s1", { uid: "u1", accountId: "3" }, 60);
    assert.equal((await adapter.findByUid("u1"))?.accountId, "3");
  });

  it("revokes every token of a grant but not the grant itself", async () => {
    await new PrismaAdapter("Grant").upsert("g1", { accountId: "1" }, 60);
    await new PrismaAdapter("AccessToken").upsert("at", { grantId: "g1" }, 60);
    await new PrismaAdapter("RefreshToken").upsert("rt", { grantId: "g1" }, 60);
    await new PrismaAdapter("AccessToken").upsert(
      "other",
      { grantId: "g2" },
      60
    );

    await new PrismaAdapter("AccessToken").revokeByGrantId("g1");

    const left = await prisma.oAuthPayload.findMany({ orderBy: { id: "asc" } });
    assert.deepEqual(
      left.map((row) => `${row.model}:${row.id}`),
      ["Grant:g1", "AccessToken:other"]
    );
  });

  it("cleans up only expired rows", async () => {
    const adapter = new PrismaAdapter("AccessToken");
    await adapter.upsert("expired", {}, 60);
    await adapter.upsert("current", {}, 60);
    await new PrismaAdapter("Grant").upsert("forever", {});
    await prisma.oAuthPayload.updateMany({
      where: { id: "expired" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await cleanUpOAuthPayloads();

    const left = await prisma.oAuthPayload.findMany({ orderBy: { id: "asc" } });
    assert.deepEqual(
      left.map((row) => row.id),
      ["current", "forever"]
    );
  });
});
