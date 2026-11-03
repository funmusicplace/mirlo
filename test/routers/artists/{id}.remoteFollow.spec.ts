import * as dotenv from "dotenv";

dotenv.config();
import assert from "node:assert";

import { Request, Response } from "express";
import { describe, it } from "mocha";
import sinon from "sinon";

import { federation } from "../../../src/activityPub/federation";
import { root } from "../../../src/activityPub/utils";
import remoteFollow from "../../../src/routers/v1/artists/{id}/remoteFollow";
import { clearTables, createProfile, createUser } from "../../utils";

const getHandler = () => remoteFollow().GET[0];

const SUBSCRIBE_REL = "http://ostatus.org/schema/1.0/subscribe";
const TEMPLATE = "https://mastodon.social/authorize_interaction?uri={uri}";

describe("artists/{id}/remoteFollow", () => {
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;
  let mockRes: Response;
  let mockNext: sinon.SinonStub;
  let lookupWebFingerStub: sinon.SinonStub;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }

    statusStub = sinon.stub().returnsThis();
    jsonStub = sinon.stub();
    mockRes = { status: statusStub, json: jsonStub } as unknown as Response;
    mockNext = sinon.stub();
    lookupWebFingerStub = sinon.stub().resolves(null);
    const originalCreateContext = federation.createContext.bind(federation);
    sinon
      .stub(federation as any, "createContext")
      .callsFake((...args: unknown[]) => {
        const ctx = (originalCreateContext as any)(...args);
        ctx.lookupWebFinger = lookupWebFingerStub;
        return ctx;
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  const callHandler = (params: object, query: object) =>
    getHandler()(
      { params, query } as unknown as Request,
      mockRes,
      mockNext as unknown as Parameters<ReturnType<typeof getHandler>>[2]
    );

  const createApProfile = async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    return createProfile(user.id, {
      activityPub: true,
    });
  };

  it("should error when handle is missing", async () => {
    const profile = await createApProfile();

    await callHandler({ id: `${profile.id}` }, {});

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
    assert.equal(lookupWebFingerStub.called, false);
  });

  it("should error when handle is not in user@server format", async () => {
    const profile = await createApProfile();

    await callHandler({ id: `${profile.id}` }, { handle: "notahandle" });

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
    assert.equal(lookupWebFingerStub.called, false);
  });

  it("should 404 when the artist doesn't exist", async () => {
    await callHandler({ id: "999999" }, { handle: "@me@mastodon.social" });

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 404);
    assert.equal(lookupWebFingerStub.called, false);
  });

  it("should error when the artist is not on the fediverse", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id, {
      name: "No AP artist",
      urlSlug: "no-ap",
    });

    await callHandler(
      { id: `${profile.id}` },
      { handle: "@me@mastodon.social" }
    );

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
    assert.equal(lookupWebFingerStub.called, false);
  });

  it("should error when the follower's server has no remote-follow template", async () => {
    const profile = await createApProfile();
    lookupWebFingerStub.resolves({
      links: [{ rel: "self", href: "https://x" }],
    });

    await callHandler(
      { id: `${profile.id}` },
      { handle: "@me@mastodon.social" }
    );

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
  });

  it("should error when the remote-follow template isn't https", async () => {
    const profile = await createApProfile();
    lookupWebFingerStub.resolves({
      links: [{ rel: SUBSCRIBE_REL, template: "javascript:alert(1)//{uri}" }],
    });

    await callHandler(
      { id: `${profile.id}` },
      { handle: "@me@mastodon.social" }
    );

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
    assert.equal(jsonStub.called, false);
  });

  it("should 404 when the follower can't be found on their server", async () => {
    const profile = await createApProfile();

    await callHandler(
      { id: `${profile.id}` },
      { handle: "@me@mastodon.social" }
    );

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 404);
  });

  it("should resolve the remote-follow redirect for the artist", async () => {
    const profile = await createApProfile();
    lookupWebFingerStub.resolves({
      links: [{ rel: SUBSCRIBE_REL, template: TEMPLATE }],
    });

    await callHandler(
      { id: `${profile.id}` },
      { handle: "@me@mastodon.social" }
    );

    assert.equal(mockNext.called, false);

    assert.equal(
      lookupWebFingerStub.getCall(0).args[0],
      "acct:me@mastodon.social"
    );

    const expectedUri = encodeURIComponent(`${profile.urlSlug}@${root}`);
    const { result } = jsonStub.getCall(0).args[0];
    assert.equal(
      result.redirectUrl,
      `https://mastodon.social/authorize_interaction?uri=${expectedUri}`
    );
  });
});
