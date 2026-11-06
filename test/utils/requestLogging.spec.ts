import assert from "node:assert";

import { describe, it } from "mocha";

import {
  sanitizeHeadersForLogs,
  sanitizeQueryForLogs,
} from "../../src/utils/requestLogging";

describe("requestLogging", () => {
  it("redacts query params that carry tokens, codes, keys or emails", () => {
    assert.deepEqual(
      sanitizeQueryForLogs({
        token: "abc",
        email: "fan@example.com",
        code: "123456",
        apiKey: "k",
        id: "42",
        format: "flac",
      }),
      {
        token: "[REDACTED]",
        email: "[REDACTED]",
        code: "[REDACTED]",
        apiKey: "[REDACTED]",
        id: "42",
        format: "flac",
      }
    );
  });

  it("redacts session and OIDC cookies but keeps others", () => {
    const { cookie } = sanitizeHeadersForLogs({
      cookie:
        "jwt=a; _session=b; _session.sig=c; _interaction=d; _interaction_resume.sig=e; theme=dark",
    });
    assert.equal(
      cookie,
      "jwt=[REDACTED]; _session=[REDACTED]; _session.sig=[REDACTED]; _interaction=[REDACTED]; _interaction_resume.sig=[REDACTED]; theme=dark"
    );
  });
});
