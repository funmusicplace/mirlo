import assert from "assert";

import { afterEach, beforeEach, describe, it } from "mocha";

import { generateFullStaticImageUrl } from "../../src/utils/images";
import { postImagePrefix } from "../../src/utils/minio";
import {
  addImageRefs,
  resolveImageRefs,
  resolvePostContent,
  resolveWidgetPaths,
  sanitizePostContent,
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

  describe("sanitizePostContent", () => {
    it("keeps what the post editor produces", () => {
      const editorOutput = [
        `<h2 dir="ltr">Tour diary</h2>`,
        `<p style="text-align:center" data-node-text-align="center">Fish &amp; chips<br /><strong>bold</strong> <em>em</em> <u>u</u> <s>s</s> <code>code</code></p>`,
        `<p><a href="https://example.com" rel="noopener noreferrer nofollow" target="_blank" data-link-auto>a link</a> <a href="https://social.example/@me" data-mention-actor="https://social.example/users/me" data-mention-handle="@me@social.example" rel="noopener noreferrer nofollow">@me</a> <a href="mailto:me@example.com">mail</a></p>`,
        `<img alt="cover" height="300" src="https://cdn.example.com/post-images/${imageId}.jpg" width="400" data-image-id="${imageId}" data-file-name="cover.jpg" />`,
        `<iframe src="/widget/trackGroup/12?variant=card" class="remirror-iframe remirror-iframe-custom" data-embed-type="custom" allowfullscreen="true" frameborder="0" allow="autoplay; fullscreen"></iframe>`,
        `<iframe src="https://www.youtube-nocookie.com/embed/abc" class="remirror-iframe remirror-iframe-youtube" data-embed-type="youtube" allowfullscreen="true" frameborder="0" width="560" height="315" allow="autoplay; fullscreen"></iframe>`,
        `<ul data-task-list><li data-task-list-item data-checked>done</li></ul>`,
        `<ol start="3"><li><p>three</p></li></ol>`,
        `<blockquote><p>quote</p></blockquote><hr /><pre class="language-js"><code data-code-block-language="js">let a = 1;</code></pre>`,
        `<table><tbody><tr><th colspan="2" data-colwidth="100,100"><p>head</p></th></tr><tr><td style="background-color:#eee" data-background-color="#eee"><p>cell</p></td></tr></tbody></table>`,
        `<img src="data:image/png;base64,iVBORw0KGgo=" />`,
      ].join("");
      assert.equal(sanitizePostContent(editorOutput), editorOutput);
    });

    it("removes scripts and event handlers", () => {
      assert.equal(
        sanitizePostContent(
          `<p onclick="alert(1)">hi</p><script>alert(2)</script><img src="x.png" onerror="alert(3)" /><svg onload="alert(4)"></svg>`
        ),
        `<p>hi</p><img src="x.png" />`
      );
    });

    it("removes javascript: links", () => {
      assert.equal(
        sanitizePostContent(`<a href="javascript:alert(1)">x</a>`),
        `<a>x</a>`
      );
      assert.equal(
        sanitizePostContent(`<a href=" JaVaScRiPt:alert(1)">x</a>`),
        `<a>x</a>`
      );
    });

    it("removes iframe srcdoc and non-http iframe sources", () => {
      assert.equal(
        sanitizePostContent(
          `<iframe srcdoc="<script>alert(1)</script>"></iframe><iframe src="data:text/html,<script>alert(2)</script>"></iframe><iframe src="javascript:alert(3)"></iframe>`
        ),
        `<iframe allow="autoplay; fullscreen"></iframe>`.repeat(3)
      );
    });

    it("keeps text styles but drops layout and url() styles", () => {
      assert.equal(
        sanitizePostContent(
          `<p style="position:fixed;top:0;z-index:9;background:url(https://evil.example/x.png);color:#f00;text-align:center">a</p>`
        ),
        `<p style="color:#f00;text-align:center">a</p>`
      );
    });

    it("limits iframe permissions to autoplay and fullscreen", () => {
      assert.equal(
        sanitizePostContent(
          `<iframe src="https://other.example/player" allow="camera; microphone; geolocation"></iframe>`
        ),
        `<iframe src="https://other.example/player" allow="autoplay; fullscreen"></iframe>`
      );
    });

    it("removes forms, objects and style blocks", () => {
      assert.equal(
        sanitizePostContent(
          `<form action="https://evil.example"><input name="password" /></form><object data="x.swf"></object><embed src="x.swf" /><style>body{display:none}</style><p>ok</p>`
        ),
        `<p>ok</p>`
      );
    });
  });
});
