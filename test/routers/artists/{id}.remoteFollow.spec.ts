import * as dotenv from "dotenv";

dotenv.config();
import assert from "node:assert";

import { Request, Response } from "express";
import { describe, it } from "mocha";
import sinon from "sinon";

import { root } from "../../../src/activityPub/utils";
import remoteFollow from "../../../src/routers/v1/artists/{id}/remoteFollow";
import { clearTables, createArtist, createUser } from "../../utils";

const getHandler = () => remoteFollow().GET[0];

const SUBSCRIBE_REL = "http://ostatus.org/schema/1.0/subscribe";
const TEMPLATE = "https://mastodon.social/authorize_interaction?uri={uri}";

describe("artists/{id}/remoteFollow", () => {
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;
  let mockRes: Response;
  let mockNext: sinon.SinonStub;
  let fetchStub: sinon.SinonStub;

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
    // Reject network by default; happy-path tests opt in with their own stub.
    fetchStub = sinon
      .stub(global, "fetch" as any)
      .rejects(new Error("Network disabled in tests"));
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

  const createApArtist = async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    return createArtist(user.id, {
      name: "Test artist",
      urlSlug: "test-artist",
      enabled: true,
      activityPub: true,
    });
  };

  it("should error when handle is missing", async () => {
    const artist = await createApArtist();

    await callHandler({ id: `${artist.id}` }, {});

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
    assert.equal(fetchStub.called, false);
  });

  it("should error when handle is not in user@server format", async () => {
    const artist = await createApArtist();

    await callHandler({ id: `${artist.id}` }, { handle: "notahandle" });

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
    assert.equal(fetchStub.called, false);
  });

  it("should 404 when the artist doesn't exist", async () => {
    await callHandler({ id: "999999" }, { handle: "@me@mastodon.social" });

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 404);
    assert.equal(fetchStub.called, false);
  });

  it("should error when the artist is not on the fediverse", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const artist = await createArtist(user.id, {
      name: "No AP artist",
      urlSlug: "no-ap",
      enabled: true,
      activityPub: false,
    });

    await callHandler(
      { id: `${artist.id}` },
      { handle: "@me@mastodon.social" }
    );

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
    assert.equal(fetchStub.called, false);
  });

  it("should error when the follower's server has no remote-follow template", async () => {
    const artist = await createApArtist();
    fetchStub.resolves({
      ok: true,
      json: async () => ({ links: [{ rel: "self", href: "https://x" }] }),
    } as unknown as Response);

    await callHandler(
      { id: `${artist.id}` },
      { handle: "@me@mastodon.social" }
    );

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 400);
  });

  it("should 404 when the follower can't be found on their server", async () => {
    const artist = await createApArtist();
    fetchStub.resolves({ ok: false } as unknown as Response);

    await callHandler(
      { id: `${artist.id}` },
      { handle: "@me@mastodon.social" }
    );

    const error = mockNext.getCall(0).args[0];
    assert.equal(error.httpCode, 404);
  });

  it("should resolve the remote-follow redirect for the artist", async () => {
    const artist = await createApArtist();
    fetchStub.resolves({
      ok: true,
      json: async () => ({
        links: [{ rel: SUBSCRIBE_REL, template: TEMPLATE }],
      }),
    } as unknown as Response);

    await callHandler(
      { id: `${artist.id}` },
      { handle: "@me@mastodon.social" }
    );

    assert.equal(mockNext.called, false);

    // It WebFingers the follower's own server, not ours.
    const webfingerUrl = fetchStub.getCall(0).args[0] as string;
    assert.equal(
      webfingerUrl,
      "https://mastodon.social/.well-known/webfinger?resource=acct:me@mastodon.social"
    );

    const expectedUri = encodeURIComponent(`${artist.urlSlug}@${root}`);
    const { result } = jsonStub.getCall(0).args[0];
    assert.equal(
      result.redirectUrl,
      `https://mastodon.social/authorize_interaction?uri=${expectedUri}`
    );
  });
});
