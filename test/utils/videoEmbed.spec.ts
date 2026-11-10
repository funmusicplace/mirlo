import assert from "assert";

import { describe, it } from "mocha";

import { videoEmbedUrl } from "../../src/utils/videoEmbed";

describe("videoEmbedUrl", () => {
  it("turns YouTube links into embed URLs", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
    ]) {
      assert.equal(
        videoEmbedUrl(link),
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        link
      );
    }
  });

  it("turns Vimeo links into embed URLs, keeping an unlisted video's hash", () => {
    assert.equal(
      videoEmbedUrl("https://vimeo.com/76979871"),
      "https://player.vimeo.com/video/76979871"
    );
    assert.equal(
      videoEmbedUrl("https://player.vimeo.com/video/76979871"),
      "https://player.vimeo.com/video/76979871"
    );
    assert.equal(
      videoEmbedUrl("https://vimeo.com/76979871/8272103f6e"),
      "https://player.vimeo.com/video/76979871?h=8272103f6e"
    );
  });

  it("returns null for anything else", () => {
    for (const link of [
      undefined,
      null,
      "",
      "not a link",
      "javascript:alert(1)",
      "https://example.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/@mirlo",
      "https://www.youtube.com/watch?v=short",
      "https://vimeo.com/channels/staffpicks",
    ]) {
      assert.equal(videoEmbedUrl(link), null, String(link));
    }
  });
});
