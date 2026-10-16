import assert from "assert";

import { describe, it } from "mocha";

import { generateFullStaticImageUrl } from "../../src/utils/images";
import { finalPostImageBucket } from "../../src/utils/minio";
import {
  addImageRefs,
  resolveImageRefs,
  resolvePostContent,
} from "../../src/utils/postContent";

const imageId = "0b5c3a52-6f1e-4c55-9d8e-2f3a4b5c6d7e";
const otherId = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("postContent", () => {
  describe("addImageRefs", () => {
    it("adds data-image-id to an img pointing at one of the post's images", () => {
      const content = `<p>Hi</p><img src="https://cdn.example.com/file/post-images/${imageId}.jpg">`;
      assert.equal(
        addImageRefs(content, [imageId]),
        `<p>Hi</p><img data-image-id="${imageId}" src="https://cdn.example.com/file/post-images/${imageId}.jpg">`
      );
    });

    it("recognises the consolidated bucket layout", () => {
      const content = `<img src="https://s3.example.com/mirlo-images/post-images/${imageId}.png" alt="x">`;
      assert.equal(
        addImageRefs(content, [imageId]),
        `<img data-image-id="${imageId}" src="https://s3.example.com/mirlo-images/post-images/${imageId}.png" alt="x">`
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
        finalPostImageBucket,
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
        finalPostImageBucket,
        "png"
      );
      assert.equal(
        resolveImageRefs(content, [{ id: imageId, extension: "png" }]),
        `<img src="${expected}" data-image-id="${imageId}">`
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

  describe("resolvePostContent", () => {
    it("passes null content through", () => {
      assert.equal(resolvePostContent({ content: null, images: [] }), null);
    });
  });
});
