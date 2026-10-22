import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { beforeEach, describe, it } from "mocha";
dotenv.config();

import { getClient } from "../../src/utils/getClient";
import { clearTables } from "../utils";

describe("getClient", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("ignores an app whose metadata document calls itself frontend", async () => {
    await prisma.client.create({
      data: {
        applicationName: "frontend",
        applicationUrl: "https://evil.example",
        allowedCorsOrigins: [],
        clientIdUrl: "https://evil.example/client.json",
        status: "pending",
      },
    });
    const frontend = await prisma.client.create({
      data: {
        applicationName: "frontend",
        applicationUrl: "https://mirlo.example",
        allowedCorsOrigins: [],
      },
    });

    const client = await getClient();

    assert.equal(client.id, frontend.id);
    assert.equal(client.applicationUrl, "https://mirlo.example");
  });
});
