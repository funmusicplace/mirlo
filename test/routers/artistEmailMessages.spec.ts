import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";
import sinon from "sinon";

import { sendMailQueue } from "../../src/queues/send-mail-queue";
import { sendPurchaseReceipt } from "../../src/utils/handleFinishedTransactions";
import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
} from "../utils";

import { requestApp } from "./utils";

const NOTE = "Use code SECRET20 for 20% off";

const setup = async () => {
  const { user, accessToken } = await createUser({ email: "artist@test.com" });
  const profile = await createProfile(user.id, { name: "Moss Choir" });
  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      properties: {
        colors: { button: "#123456" },
        emails: { purchase: `<p>${NOTE}</p>`, support: "<p>Thanks!</p>" },
      },
    },
  });
  const trackGroup = await createTrackGroup(profile.id, { title: "Tidal" });
  return { user, accessToken, profile, trackGroup };
};

describe("artist thank-you messages", () => {
  beforeEach(async () => {
    await clearTables();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("leaves them out of public artist and release responses", async () => {
    const { profile, trackGroup } = await setup();

    for (const path of [
      `artists/${profile.id}`,
      `artists`,
      `trackGroups/${trackGroup.id}`,
    ]) {
      const response = await requestApp.get(path);
      assert.equal(response.status, 200, path);
      assert(!response.text.includes("SECRET20"), path);
    }

    const artist = (await requestApp.get(`artists/${profile.id}`)).body.result;
    assert.equal(artist.properties.colors.button, "#123456");
  });

  it("returns them to the artist on the manage endpoint", async () => {
    const { profile, accessToken } = await setup();

    const response = await requestApp
      .get(`manage/artists/${profile.id}`)
      .set("Cookie", [`jwt=${accessToken}`]);

    assert.equal(response.status, 200);
    assert.equal(
      response.body.result.properties.emails.purchase,
      `<p>${NOTE}</p>`
    );
  });

  it("sanitises them on save", async () => {
    const { profile, accessToken } = await setup();

    const response = await requestApp
      .put(`manage/artists/${profile.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .send({
        properties: {
          emails: {
            purchase:
              '<p>Thanks</p><img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a>',
          },
        },
      });
    assert.equal(response.status, 200);

    const saved = await prisma.profile.findFirstOrThrow({
      where: { id: profile.id },
    });
    const { emails, colors } = saved.properties as {
      emails: { purchase: string; support: string };
      colors: { button: string };
    };
    assert(emails.purchase.includes("<p>Thanks</p>"));
    assert(!/onerror|<script|javascript:/.test(emails.purchase));
    assert.equal(emails.support, "<p>Thanks!</p>");
    assert.equal(colors.button, "#123456");
  });

  it("keeps them in the purchase receipt email", async () => {
    const { profile } = await setup();
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const add = sinon.stub(sendMailQueue, "add").resolves();
    const artist = await prisma.profile.findFirstOrThrow({
      where: { id: profile.id },
      include: { user: true },
    });

    await sendPurchaseReceipt(artist as any, buyer as any, []);

    const receipt = add
      .getCalls()
      .find((call) => call.args[1].template === "purchase-receipt");
    assert(receipt);
    assert.equal(
      receipt.args[1].locals.artist.properties.emails.purchase,
      `<p>${NOTE}</p>`
    );
  });
});
