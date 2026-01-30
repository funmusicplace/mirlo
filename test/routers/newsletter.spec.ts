import assert from "node:assert";
import { randomUUID } from "node:crypto";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { clearTables, createArtist, createUser } from "../utils";
import { requestApp } from "./utils";

async function createInstanceArtist() {
  const { user: artistUser } = await createUser({
    email: "artist@example.com",
  });

  const artist = await createArtist(artistUser.id, {
    name: "Instance Artist",
    urlSlug: `instance-artist-${randomUUID()}`,
  });

  await prisma.settings.create({
    data: {
      settings: {
        platformPercent: 10,
        instanceCustomization: {
          artistId: artist.id,
        },
      },
    },
  });

  return { artist };
}

describe("artists/{id}/follow newsletter", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("requires an email address when not authenticated", async () => {
    const { artist } = await createInstanceArtist();

    const response = await requestApp
      .post(`artists/${artist.id}/follow`)
      .set("Accept", "application/json");

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "Email is required");
  });

  it("requires the email to be verified", async () => {
    const { artist } = await createInstanceArtist();

    const { user: listener, accessToken } = await createUser({
      email: "listener@example.com",
      emailConfirmationToken: randomUUID(),
    });

    const response = await requestApp
      .post(`artists/${artist.id}/follow`)
      .send({ email: listener.email })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 401);
    assert.equal(
      response.body.error,
      "Please verify your email before subscribing."
    );
  });

  it("subscribes a verified user", async () => {
    const { artist } = await createInstanceArtist();

    const { user: listener, accessToken } = await createUser({
      email: "listener@example.com",
      emailConfirmationToken: null,
      emailConfirmationExpiration: null,
      receiveMailingList: false,
    });

    const response = await requestApp
      .post(`artists/${artist.id}/follow`)
      .send({ email: listener.email })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert(Array.isArray(response.body.results));

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
    const { artist } = await createInstanceArtist();

    const { user: existingUser, accessToken } = await createUser({
      email: "existing@example.com",
      receiveMailingList: false,
      emailConfirmationToken: null,
      emailConfirmationExpiration: null,
    });

    const response = await requestApp
      .post(`artists/${artist.id}/follow`)
      .send({ email: existingUser.email })
      .set("Cookie", [`jwt=${accessToken}`])
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

  it("marks confirmed subscribers for the mailing list", async () => {
    const { artist } = await createInstanceArtist();

    const token = randomUUID();
    const email = "new-listener@example.com";

    await prisma.artistUserSubscriptionConfirmation.create({
      data: {
        email,
        artistId: artist.id,
        token,
        tokenExpiration: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    process.env.REACT_APP_CLIENT_DOMAIN = "https://example.com";

    const response = await requestApp
      .get(`artists/${artist.id}/confirmFollow`)
      .query({ email, token })
      .set("Accept", "application/json");

    assert.equal(response.status, 302);

    const subscriber = await prisma.user.findFirstOrThrow({
      where: { email },
    });

    assert.equal(subscriber.receiveMailingList, true);
  });
});
