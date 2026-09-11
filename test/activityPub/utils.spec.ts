import assert from "assert";

import { describe, it } from "mocha";

import { isValidActivityPubEndpoint } from "../../src/activityPub/utils";

describe("isValidActivityPubEndpoint", () => {
  it("matches a plain ASCII artist actor", () => {
    assert.equal(isValidActivityPubEndpoint("/v1/ap/artists/simon-test"), true);
  });

  it("matches an artist sub-collection", () => {
    assert.equal(
      isValidActivityPubEndpoint("/v1/ap/artists/simon-test/followers"),
      true
    );
  });

  // See #2298: slugs with non-ASCII characters arrive percent-encoded, which
  // used to fail the route guard and left those artists invisible to the
  // fediverse.
  it("matches a percent-encoded non-ASCII slug", () => {
    assert.equal(
      isValidActivityPubEndpoint("/v1/ap/artists/rau%C3%B0vik"),
      true
    );
  });

  it("matches a percent-encoded non-ASCII slug with a sub-collection", () => {
    assert.equal(
      isValidActivityPubEndpoint("/v1/ap/artists/rau%C3%B0vik/outbox"),
      true
    );
  });

  it("matches a raw non-ASCII slug", () => {
    assert.equal(isValidActivityPubEndpoint("/v1/ap/artists/rauðvik"), true);
  });

  it("matches a post under a non-ASCII slug", () => {
    assert.equal(
      isValidActivityPubEndpoint("/v1/ap/artists/rau%C3%B0vik/posts/12"),
      true
    );
  });

  it("matches well-known endpoints", () => {
    assert.equal(isValidActivityPubEndpoint("/.well-known/webfinger"), true);
    assert.equal(isValidActivityPubEndpoint("/.well-known/nodeinfo"), true);
  });

  it("rejects an unknown sub-collection", () => {
    assert.equal(
      isValidActivityPubEndpoint("/v1/ap/artists/simon-test/bogus"),
      false
    );
  });

  it("does not let an encoded slash smuggle in an extra path segment", () => {
    assert.equal(isValidActivityPubEndpoint("/v1/ap/artists/foo%2Fbar"), false);
  });

  it("rejects a malformed percent escape rather than throwing", () => {
    assert.equal(isValidActivityPubEndpoint("/v1/ap/artists/%"), false);
  });

  it("rejects a missing slug", () => {
    assert.equal(isValidActivityPubEndpoint("/v1/ap/artists/"), false);
  });

  it("rejects non-ActivityPub routes", () => {
    assert.equal(isValidActivityPubEndpoint("/v1/trackGroups"), false);
  });
});
