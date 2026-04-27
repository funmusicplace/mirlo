import assert from "node:assert";
import crypto from "node:crypto";

import * as dotenv from "dotenv";
dotenv.config();
import { afterEach, describe, it } from "mocha";
import sinon from "sinon";

import * as httpClientModule from "../../src/activityPub/httpClient";
import * as utilsModule from "../../src/activityPub/utils";

describe("activityPub/utils", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("retries key fetch with signed GET and includes accept in signed headers", async () => {
    const keyId = `https://remote.example/users/alice#main-key-${Date.now()}`;
    const actorUrl = keyId.split("#")[0];

    const { privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    sinon.stub(utilsModule, "generateKeysForSiteIfNeeded").resolves({
      privateKey,
      publicKey: "unused",
    } as any);

    const fetchStub = sinon
      .stub(httpClientModule, "fetchActivityPubDocument")
      .callsFake(async (url: string, extraHeaders?: Record<string, string>) => {
        if (url === keyId && !extraHeaders) {
          const unauthorizedError: any = new Error("Unauthorized");
          unauthorizedError.response = { statusCode: 401 };
          throw unauthorizedError;
        }

        if (url === keyId && extraHeaders) {
          return {
            publicKey: {
              id: keyId,
              publicKeyPem: "REMOTE_PUBLIC_KEY_PEM",
            },
          } as any;
        }

        if (url === actorUrl) {
          return {
            publicKey: {
              id: keyId,
              publicKeyPem: "REMOTE_PUBLIC_KEY_PEM",
            },
          } as any;
        }

        throw new Error(`Unexpected URL in fetch stub: ${url}`);
      });

    const publicKey = await utilsModule.fetchRemotePublicKey(keyId, "gribbles");

    assert.equal(publicKey, "REMOTE_PUBLIC_KEY_PEM");
    assert(fetchStub.callCount >= 2);

    const retryCall = fetchStub
      .getCalls()
      .find((call) => call.args[0] === keyId && call.args[1]);

    assert(retryCall, "Expected signed retry call with headers");

    const retryHeaders = retryCall!.args[1] as Record<string, string>;
    assert.equal(
      retryHeaders.Accept,
      httpClientModule.ACTIVITYPUB_ACCEPT_HEADER,
      "Expected signed retry to send ActivityPub Accept header"
    );
    assert(
      !!retryHeaders.Signature,
      "Expected signed retry to include Signature header"
    );
    assert(
      retryHeaders.Signature.includes(
        'headers="(request-target) host date accept"'
      ),
      "Expected Signature signed headers to include accept"
    );
    assert(
      retryHeaders.Signature.includes(
        'keyId="https://localhost/v1/artists/gribbles#main-key"'
      ) || retryHeaders.Signature.includes("/v1/artists/gribbles#main-key"),
      "Expected Signature keyId to include local actor key"
    );
  });
});
