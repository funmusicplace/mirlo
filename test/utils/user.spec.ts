import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { findOrCreateUserBasedOnEmail } from "../../src/utils/user";
import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";

import assert from "assert";

describe("findOrCreateUserBasedOnEmail", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("sets the name when creating a new guest user", async () => {
    const { user } = await findOrCreateUserBasedOnEmail(
      "guest@test.com",
      undefined,
      "Jane Supporter"
    );
    assert.equal(user?.name, "Jane Supporter");

    const inDb = await prisma.user.findFirst({
      where: { email: "guest@test.com" },
    });
    assert.equal(inDb?.name, "Jane Supporter");
  });

  it("backfills a name for an existing user that has none", async () => {
    const { user: existing } = await createUser({
      email: "noname@test.com",
      name: null,
    });
    assert.equal(existing.name, null);

    const { user } = await findOrCreateUserBasedOnEmail(
      "noname@test.com",
      undefined,
      "Backfilled Name"
    );
    assert.equal(user?.name, "Backfilled Name");
  });

  it("never overwrites an existing name", async () => {
    const { user: existing } = await createUser({
      email: "named@test.com",
      name: "Original Name",
    });

    const { user } = await findOrCreateUserBasedOnEmail(
      "named@test.com",
      existing.id,
      "Should Not Apply"
    );
    assert.equal(user?.name, "Original Name");
  });

  it("does not require a name", async () => {
    const { user } = await findOrCreateUserBasedOnEmail("plain@test.com");
    assert.ok(user, "user should be created");
    assert.equal(user?.name, null);
  });
});
