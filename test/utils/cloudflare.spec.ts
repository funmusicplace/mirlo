import assert from "assert";

import { Request, Response as ExpressResponse } from "express";
import sinon from "sinon";

import { requireSpamChallenge } from "../../src/utils/cloudflare";
import { AppError } from "../../src/utils/error";
import { clearTables, createSiteSettings } from "../utils";

const buildReq = (body: Record<string, unknown>, user?: object) =>
  ({
    body,
    user,
    ip: "10.0.0.1",
    get: (name: string) =>
      name.toLowerCase() === "cf-connecting-ip" ? "203.0.113.7" : undefined,
  }) as unknown as Request;

const run = async (
  middleware: ReturnType<typeof requireSpamChallenge>,
  req: Request
) => {
  const next = sinon.stub();
  await middleware(req, {} as ExpressResponse, next);
  sinon.assert.calledOnce(next);
  return next.firstCall.args[0] as AppError | undefined;
};

describe("requireSpamChallenge", () => {
  let fetchStub: sinon.SinonStub;
  const nodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    await clearTables();
    process.env.NODE_ENV = "production";
    fetchStub = sinon.stub(globalThis, "fetch");
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
    sinon.restore();
  });

  it("verifies the token with the saved secret and the visitor's IP", async () => {
    await createSiteSettings({ cloudflareTurnstileSecret: "0xsecret" });
    fetchStub.resolves(new Response(JSON.stringify({ success: true })));

    const error = await run(
      requireSpamChallenge(),
      buildReq({ cfTurnstile: "token" })
    );

    assert.equal(error, undefined);
    assert.deepEqual(JSON.parse(fetchStub.firstCall.args[1].body), {
      secret: "0xsecret",
      response: "token",
      remoteip: "203.0.113.7",
    });
  });

  it("rejects a missing or failed token", async () => {
    await createSiteSettings({ cloudflareTurnstileSecret: "0xsecret" });
    fetchStub.resolves(new Response(JSON.stringify({ success: false })));

    const missing = await run(requireSpamChallenge(), buildReq({}));
    const failed = await run(
      requireSpamChallenge(),
      buildReq({ cfTurnstile: "bad" })
    );

    assert.equal(missing?.httpCode, 400);
    assert.equal(failed?.httpCode, 400);
  });

  it("refuses requests when no secret is configured, unless told to skip", async () => {
    await createSiteSettings({});

    const required = await run(requireSpamChallenge(), buildReq({}));
    const optional = await run(
      requireSpamChallenge({ skipIfNoSecret: true }),
      buildReq({})
    );

    assert.equal(required?.httpCode, 500);
    assert.equal(optional, undefined);
    sinon.assert.notCalled(fetchStub);
  });

  it("lets skipped requests through without a token", async () => {
    await createSiteSettings({ cloudflareTurnstileSecret: "0xsecret" });

    const error = await run(
      requireSpamChallenge({ skip: (req) => Boolean(req.user) }),
      buildReq({}, { id: 1 })
    );

    assert.equal(error, undefined);
    sinon.assert.notCalled(fetchStub);
  });
});
