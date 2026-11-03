import * as dotenv from "dotenv";

dotenv.config();
import assert from "node:assert";

import { Image, Person } from "@fedify/fedify/vocab";
import { Request, Response } from "express";
import { describe, it } from "mocha";
import sinon from "sinon";

import { federation } from "../../../src/activityPub/federation";
import { userAuthenticated } from "../../../src/auth/passport";
import webfinger from "../../../src/routers/v1/activityPub/webfinger";

const getHandler = () => webfinger().GET[1];

describe("activityPub/webfinger", () => {
  let jsonStub: sinon.SinonStub;
  let mockRes: Response;
  let mockNext: sinon.SinonStub;
  let lookupObjectStub: sinon.SinonStub;

  beforeEach(() => {
    jsonStub = sinon.stub();
    mockRes = { json: jsonStub } as unknown as Response;
    mockNext = sinon.stub();
    lookupObjectStub = sinon.stub().resolves(null);
    const originalCreateContext = federation.createContext.bind(federation);
    sinon
      .stub(federation as any, "createContext")
      .callsFake((...args: unknown[]) => {
        const ctx = (originalCreateContext as any)(...args);
        ctx.lookupObject = lookupObjectStub;
        return ctx;
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  const callHandler = (query: object) =>
    getHandler()(
      { query } as unknown as Request,
      mockRes,
      mockNext as unknown as Parameters<ReturnType<typeof getHandler>>[2]
    );

  it("should require authentication", () => {
    assert.equal(webfinger().GET[0], userAuthenticated);
  });

  it("should error when resource is not in user@server format", async () => {
    await callHandler({ resource: "notahandle" });

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
    assert.equal(lookupObjectStub.called, false);
  });

  it("should 404 when no actor is found", async () => {
    await callHandler({ resource: "acct:me@mastodon.social" });

    assert.equal(
      lookupObjectStub.getCall(0).args[0],
      "acct:me@mastodon.social"
    );
    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 404);
  });

  it("should return the actor", async () => {
    lookupObjectStub.resolves(
      new Person({
        id: new URL("https://mastodon.social/users/me"),
        name: "Me",
        preferredUsername: "me",
        url: new URL("https://mastodon.social/@me"),
        inbox: new URL("https://mastodon.social/users/me/inbox"),
        icon: new Image({ url: new URL("https://mastodon.social/me.png") }),
      })
    );

    await callHandler({ resource: "me@mastodon.social" });

    assert.equal(mockNext.called, false);
    assert.deepEqual(jsonStub.getCall(0).args[0].result, {
      id: "https://mastodon.social/users/me",
      name: "Me",
      preferredUsername: "me",
      url: "https://mastodon.social/@me",
      inbox: "https://mastodon.social/users/me/inbox",
      iconUrl: "https://mastodon.social/me.png",
    });
  });
});
