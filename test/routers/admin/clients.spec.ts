import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { beforeEach, describe, it } from "mocha";

import { clearTables, createUser } from "../../utils";
import { requestApp } from "../utils";

describe("admin/clients", () => {
  let adminToken: string;

  beforeEach(async () => {
    await clearTables();
    const { accessToken } = await createUser({
      email: "admin@test.com",
      isAdmin: true,
    });
    adminToken = accessToken;
  });

  it("creates and updates OAuth redirect URIs and the confidential flag", async () => {
    const created = await requestApp
      .post("admin/clients")
      .set("Cookie", [`jwt=${adminToken}`])
      .send({
        applicationName: "Fider",
        applicationUrl: "https://feedback.example",
        redirectUris: ["https://feedback.example/oauth/mirlo/callback"],
        confidential: true,
      });
    assert.equal(created.status, 200, created.text);
    assert.deepEqual(created.body.result.redirectUris, [
      "https://feedback.example/oauth/mirlo/callback",
    ]);
    assert.equal(created.body.result.confidential, true);

    const updated = await requestApp
      .put(`admin/clients/${created.body.result.id}`)
      .set("Cookie", [`jwt=${adminToken}`])
      .send({ redirectUris: ["myapp://callback"], confidential: false });
    assert.equal(updated.status, 200, updated.text);
    assert.deepEqual(updated.body.result.redirectUris, ["myapp://callback"]);
    assert.equal(updated.body.result.confidential, false);
  });

  it("refuses redirect URIs that aren't URLs or have a fragment", async () => {
    for (const redirectUris of [["not a url"], ["https://a.example/#x"], "x"]) {
      const response = await requestApp
        .post("admin/clients")
        .set("Cookie", [`jwt=${adminToken}`])
        .send({
          applicationName: "App",
          applicationUrl: "https://a.example",
          redirectUris,
        });
      assert.equal(response.status, 400, JSON.stringify(redirectUris));
    }
  });
});
