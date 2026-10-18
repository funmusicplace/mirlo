import assert from "assert";

import { afterEach, beforeEach, describe, it } from "mocha";

import { generateFullStaticImageUrl } from "../../src/utils/images";
import { postImagePrefix } from "../../src/utils/minio";
import {
  addImageRefs,
  resolveImageRefs,
  resolvePostContent,
  resolveWidgetPaths,
  stripWidgetHosts,
} from "../../src/utils/postContent";

const imageId = "0b5c3a52-6f1e-4c55-9d8e-2f3a4b5c6d7e";
const otherId = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("postContent", () => {
  describe("addImageRefs", () => {
    it("adds data-image-id to an img pointing at one of the post's images", () => {
      const content = `<p>Hi</p><img src="https://cdn.example.com/file/post-images/${imageId}.jpg">`;
      assert.equal(
        addImageRefs(content, [imageId]),
        `<p>Hi</p><img src="https://cdn.example.com/file/post-images/${imageId}.jpg" data-image-id="${imageId}">`
      );
    });

    it("handles a > inside another attribute", () => {
      const content = `<img alt="before > after" src="https://cdn.example.com/post-images/${imageId}.jpg">`;
      assert.equal(
        addImageRefs(content, [imageId]),
        `<img alt="before > after" src="https://cdn.example.com/post-images/${imageId}.jpg" data-image-id="${imageId}">`
      );
    });

    it("recognises the consolidated bucket layout", () => {
      const content = `<img src="https://s3.example.com/mirlo-images/post-images/${imageId}.png" alt="x">`;
      assert.equal(
        addImageRefs(content, [imageId]),
        `<img src="https://s3.example.com/mirlo-images/post-images/${imageId}.png" alt="x" data-image-id="${imageId}">`
      );
    });

    it("leaves images that don't belong to the post alone", () => {
      const content = `<img src="https://cdn.example.com/post-images/${otherId}.jpg">`;
      assert.equal(addImageRefs(content, [imageId]), content);
    });

    it("leaves externally hosted images alone", () => {
      const content = `<img src="https://example.org/cat.gif">`;
      assert.equal(addImageRefs(content, [imageId]), content);
    });

    it("doesn't add a second data-image-id", () => {
      const content = `<img data-image-id="${imageId}" src="https://old.example.com/${imageId}.jpg">`;
      assert.equal(addImageRefs(content, [imageId]), content);
    });
  });

  describe("resolveImageRefs", () => {
    it("rebuilds src from the image id", () => {
      const content = `<p>a</p><img data-image-id="${imageId}" src="https://old.example.com/post-images/${imageId}.jpg" alt="x"><p>b</p>`;
      const expected = generateFullStaticImageUrl(
        imageId,
        postImagePrefix,
        "jpg"
      );
      assert.equal(
        resolveImageRefs(content, [{ id: imageId, extension: "jpg" }]),
        `<p>a</p><img data-image-id="${imageId}" src="${expected}" alt="x"><p>b</p>`
      );
    });

    it("adds a src when the tag has none", () => {
      const content = `<img data-image-id="${imageId}">`;
      const expected = generateFullStaticImageUrl(
        imageId,
        postImagePrefix,
        "png"
      );
      assert.equal(
        resolveImageRefs(content, [{ id: imageId, extension: "png" }]),
        `<img data-image-id="${imageId}" src="${expected}">`
      );
    });

    it("replaces a src containing the other quote character", () => {
      const content = `<img data-image-id="${imageId}" alt="a > b" src="https://old.example.com/it's/${imageId}.jpg">`;
      const expected = generateFullStaticImageUrl(
        imageId,
        postImagePrefix,
        "jpg"
      );
      assert.equal(
        resolveImageRefs(content, [{ id: imageId, extension: "jpg" }]),
        `<img data-image-id="${imageId}" alt="a > b" src="${expected}">`
      );
    });

    it("leaves tags with an unknown or missing id alone", () => {
      const content = `<img data-image-id="${otherId}" src="a.jpg"><img src="b.jpg">`;
      assert.equal(
        resolveImageRefs(content, [{ id: imageId, extension: "jpg" }]),
        content
      );
    });
  });

  describe("stripWidgetHosts", () => {
    const origins = ["https://mirlo.example"];

    it("makes this instance's widget iframes relative", () => {
      const content = `<p>a</p><iframe src="https://mirlo.example/widget/track/12?variant=card" height="137"></iframe>`;
      assert.equal(
        stripWidgetHosts(content, origins),
        `<p>a</p><iframe src="/widget/track/12?variant=card" height="137"></iframe>`
      );
    });

    it("leaves other hosts, other paths and relative widgets alone", () => {
      const content = `<iframe src="https://other.example/widget/trackGroup/3"></iframe><iframe src="https://mirlo.example/embed/video"></iframe><iframe src="/widget/track/1"></iframe>`;
      assert.equal(stripWidgetHosts(content, origins), content);
    });
  });

  describe("resolveWidgetPaths", () => {
    let previous: string | undefined;

    beforeEach(() => {
      previous = process.env.CLIENT_DOMAIN;
      process.env.CLIENT_DOMAIN = "https://now.example/";
    });

    afterEach(() => {
      if (previous === undefined) {
        delete process.env.CLIENT_DOMAIN;
      } else {
        process.env.CLIENT_DOMAIN = previous;
      }
    });

    it("prefixes relative widget paths with the current domain", () => {
      assert.equal(
        resolveWidgetPaths(`<iframe src="/widget/trackGroup/3"></iframe>`),
        `<iframe src="https://now.example/widget/trackGroup/3"></iframe>`
      );
    });

    it("leaves absolute and non-widget iframes alone", () => {
      const content = `<iframe src="https://other.example/widget/track/2"></iframe><iframe src="/embed/video"></iframe>`;
      assert.equal(resolveWidgetPaths(content), content);
    });
  });

  describe("resolvePostContent", () => {
    it("passes null content through", () => {
      assert.equal(resolvePostContent({ content: null, images: [] }), null);
    });
  });
});
