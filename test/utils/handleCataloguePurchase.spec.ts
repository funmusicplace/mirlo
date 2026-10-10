import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";

import assert from "assert";

import { describe, it } from "mocha";
import sinon from "sinon";

import { sendMailQueue } from "../../src/queues/send-mail-queue";
import { handleCataloguePurchase } from "../../src/utils/handleFinishedTransactions";
import { calculateAppFee } from "../../src/utils/processingPayments";
import {
  clearTables,
  createTrackGroup,
  createUser,
  fakePayment,
} from "../utils";

describe("handleCataloguePurchase", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should pass a resolved, correctly-scaled platformCut to the artist notification template", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });
    const { user: purchaser } = await createUser({
      email: "buyer@buyer.com",
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    await createTrackGroup(artist.id, { title: "Album One" });

    await handleCataloguePurchase(
      purchaser.id,
      artist.id,
      fakePayment({ id: "pi_test_catalogue", amount: 1000 })
    );

    const notificationCall = stub
      .getCalls()
      .find(
        (call) =>
          call.args[1].template === "catalogue-purchase-artist-notification"
      );
    assert.ok(notificationCall, "should send the artist notification email");

    const locals = notificationCall!.args[1].locals as {
      platformCut: number;
      pricePaid: number;
    };

    // Regression test: platformCut used to be an un-awaited Promise (the `??`
    // in `calculateAppFee(...) ?? 0 / 100` never resolved it, and operator
    // precedence meant `/100` was applied to the fallback `0`, not the fee).
    assert.equal(
      typeof locals.platformCut,
      "number",
      "platformCut must be a resolved number, not a pending Promise"
    );

    const expectedFeeCents = await calculateAppFee(1000, "usd");
    assert.equal(
      locals.platformCut,
      expectedFeeCents / 100,
      "platformCut must equal the calculated app fee, scaled to dollars like pricePaid's own template display"
    );
  });
});
