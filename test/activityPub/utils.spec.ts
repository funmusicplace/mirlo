import assert from "assert";

import { describe, it } from "mocha";

import {
  isValidActivityPubEndpoint,
  parseMentionsFromContent,
} from "../../src/activityPub/utils";

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

  it("matches the nodeinfo document", () => {
    assert.equal(isValidActivityPubEndpoint("/nodeinfo/2.1"), true);
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

describe("parseMentionsFromContent", () => {
  it("should parse single mention from HTML content", () => {
    const content =
      'Check this out: <a href="https://mastodon.example/users/alice" data-mention-actor="https://mastodon.example/users/alice">@alice</a>';
    const mentions = parseMentionsFromContent(content);

    assert.strictEqual(mentions.length, 1);
    assert.strictEqual(
      mentions[0].href,
      "https://mastodon.example/users/alice"
    );
    assert.strictEqual(mentions[0].name, "@alice");
  });

  it("should parse multiple mentions from HTML content", () => {
    const content =
      '<a data-mention-actor="https://mastodon.example/users/alice">@alice</a> and <a data-mention-actor="https://pixelfed.example/users/bob" href="#">@bob</a>';
    const mentions = parseMentionsFromContent(content);

    assert.strictEqual(mentions.length, 2);
    assert.strictEqual(
      mentions[0].href,
      "https://mastodon.example/users/alice"
    );
    assert.strictEqual(mentions[0].name, "@alice");
    assert.strictEqual(mentions[1].href, "https://pixelfed.example/users/bob");
    assert.strictEqual(mentions[1].name, "@bob");
  });

  it("should handle mentions with complex display names", () => {
    const content =
      '<a data-mention-actor="https://example.com/users/alice">alice@example.com</a>';
    const mentions = parseMentionsFromContent(content);

    assert.strictEqual(mentions.length, 1);
    assert.strictEqual(mentions[0].href, "https://example.com/users/alice");
    assert.strictEqual(mentions[0].name, "alice@example.com");
  });

  it("should ignore mentions without data-mention-actor attribute", () => {
    const content =
      '<a href="https://example.com">regular link</a> and <a data-mention-actor="https://mastodon.example/users/alice">@alice</a>';
    const mentions = parseMentionsFromContent(content);

    assert.strictEqual(mentions.length, 1);
    assert.strictEqual(mentions[0].name, "@alice");
  });

  it("should handle mentions with inner HTML tags", () => {
    const content =
      '<a data-mention-actor="https://mastodon.example/users/alice"><span class="mention">@alice</span></a>';
    const mentions = parseMentionsFromContent(content);

    assert.strictEqual(mentions.length, 1);
    assert.strictEqual(mentions[0].name, "@alice");
  });

  it("should return empty array for content with no mentions", () => {
    const content = "This is plain text with no mentions at all";
    const mentions = parseMentionsFromContent(content);

    assert.strictEqual(mentions.length, 0);
  });

  it("should return empty array for empty content", () => {
    const mentions = parseMentionsFromContent("");
    assert.strictEqual(mentions.length, 0);
  });

  it("should handle case-insensitive matching", () => {
    const content =
      '<A data-mention-actor="https://mastodon.example/users/alice">@alice</A>';
    const mentions = parseMentionsFromContent(content);

    assert.strictEqual(mentions.length, 1);
    assert.strictEqual(mentions[0].name, "@alice");
  });
});
