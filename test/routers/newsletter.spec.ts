import assert from "node:assert";
import { randomUUID } from "node:crypto";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { clearTables, createArtist, createUser } from "../utils";
import { requestApp } from "./utils";

describe("newsletter", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("requires an email address", async () => {
    const response = await requestApp
      .post("newsletter")
      .set("Accept", "application/json");

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "Email is required");
  });

  it("requires the email to be verified", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@example.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Instance Artist",
      urlSlug: "instance-artist",
    });

    await prisma.settings.create({
      data: {
        settings: {
          platformPercent: 10,
          instanceArtistId: artist.id,
        },
      },
    });

    await createUser({
      email: "listener@example.com",
      emailConfirmationToken: randomUUID(),
    });

    const response = await requestApp
      .post("newsletter")
      .send({ email: "listener@example.com" })
      .set("Accept", "application/json");

    assert.equal(response.status, 401);
    assert.equal(
      response.body.error,
      "Please verify your email before subscribing."
    );
  });

  it("subscribes a verified user", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@example.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Instance Artist",
      urlSlug: "instance-artist",
    });

    await prisma.settings.create({
      data: {
        settings: {
          platformPercent: 10,
          instanceArtistId: artist.id,
        },
      },
    });

    const { user: listener } = await createUser({
      email: "listener@example.com",
      emailConfirmationToken: null,
      emailConfirmationExpiration: null,
      receiveMailingList: false,
    });

    const response = await requestApp
      .post("newsletter")
      .send({ email: "listener@example.com" })
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "success");

    const subscriber = await prisma.user.findFirstOrThrow({
      where: {
        id: listener.id,
      },
    });

    assert.equal(subscriber.receiveMailingList, true);

    const subscription = await prisma.artistUserSubscription.findFirst({
      where: {
        userId: subscriber.id,
        artistSubscriptionTier: {
          artistId: artist.id,
        },
      },
    });

    assert(subscription);
  });

  it("updates an existing user to receive the mailing list", async () => {
    const { user: artistUser } = await createUser({
      email: "artist2@example.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Instance Artist",
      urlSlug: "instance-artist-2",
    });

    await prisma.settings.create({
      data: {
        settings: {
          platformPercent: 10,
          instanceArtistId: artist.id,
        },
      },
    });

    const { user: existingUser } = await createUser({
      email: "existing@example.com",
      receiveMailingList: false,
      emailConfirmationToken: null,
      emailConfirmationExpiration: null,
    });

    const response = await requestApp
      .post("newsletter")
      .send({ email: "existing@example.com" })
      .set("Accept", "application/json");

    assert.equal(response.status, 200);

    const updatedUser = await prisma.user.findFirst({
      where: {
        id: existingUser.id,
      },
    });

    assert(updatedUser);
    assert.equal(updatedUser?.receiveMailingList, true);

    const subscription = await prisma.artistUserSubscription.findFirst({
      where: {
        userId: existingUser.id,
        artistSubscriptionTier: {
          artistId: artist.id,
        },
      },
    });

    assert(subscription);
  });
});
