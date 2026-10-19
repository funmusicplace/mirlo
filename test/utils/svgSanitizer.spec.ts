import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it } from "mocha";

import { sanitizeSvg } from "../../src/utils/svgSanitizer";

const PUBLIC_DIR = join(__dirname, "..", "..", "client", "public");

const isRejected = (svg: string, reason?: RegExp) =>
  assert.throws(
    () => sanitizeSvg(svg),
    (e: { httpCode: number; description: string }) =>
      e.httpCode === 400 && (!reason || reason.test(e.description))
  );

describe("svgSanitizer", () => {
  for (const file of [
    "Logo-With-Wordmark.svg",
    "Logo_Mirlo_InsideCircle.svg",
    "Logo_Mirlo_LogoOnly.svg",
    "Logo_Mirlo_Transparent_RedCircle.svg",
  ]) {
    it(`accepts the bundled ${file}`, () => {
      const result = sanitizeSvg(readFileSync(join(PUBLIC_DIR, file), "utf8"));
      assert.ok(result.width > 0 && result.height > 0);
    });
  }

  it("reads the size from the viewBox without rounding", () => {
    const { width, height } = sanitizeSvg(
      `<svg viewBox="0 0 152.47 174.97"><path d="M0 0"/></svg>`
    );
    assert.equal(width, 152.47);
    assert.equal(height, 174.97);
  });

  it("falls back to width and height", () => {
    const { width, height } = sanitizeSvg(
      `<svg width="120px" height="40"><path d="M0 0"/></svg>`
    );
    assert.equal(width, 120);
    assert.equal(height, 40);
  });

  it("strips editor metadata", () => {
    const { markup } = sanitizeSvg(
      `<svg xmlns:inkscape="x" viewBox="0 0 1 1" inkscape:version="1"><metadata>rdf</metadata><path data-name="a" d="M0 0"/></svg>`
    );
    assert.doesNotMatch(markup, /inkscape|metadata|data-name/);
  });

  it("adds the SVG namespaces browsers need", () => {
    const { markup } = sanitizeSvg(
      `<svg viewBox="0 0 1 1"><defs><path id="a" d="M0 0"/></defs><use xlink:href="#a"/></svg>`
    );
    assert.match(markup, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(markup, /xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/);
  });

  it("keeps internal references, gradients, filters and styles", () => {
    const { markup } = sanitizeSvg(
      `<svg viewBox="0 0 1 1"><style type="text/css">.a{fill:#000}</style><defs><linearGradient id="g"><stop offset="0"/></linearGradient><filter id="s"><feGaussianBlur stdDeviation="1"/></filter></defs><rect class="a" fill="url(#g)" filter="url(#s)" shape-rendering="crispEdges"/><use href="#g"/></svg>`
    );
    assert.match(markup, /url\(#g\)/);
    assert.match(markup, /feGaussianBlur/);
  });

  it("accepts a doctype without an internal subset", () => {
    sanitizeSvg(
      `<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg viewBox="0 0 1 1"/>`
    );
  });

  it("accepts text layout attributes and strips Inkscape swatch references", () => {
    const { markup } = sanitizeSvg(
      `<svg xmlns:osb="x" viewBox="0 0 10 4" focusable="false"><defs><linearGradient id="g" osb:paint="solid"/></defs><text textLength="10" word-spacing="1"><textPath href="#p">Mirlo</textPath></text><path id="p" d="M0 0"/></svg>`
    );
    assert.doesNotMatch(markup, /osb:/);
  });

  it("keeps xmlns on the root only", () => {
    const { markup } = sanitizeSvg(
      `<svg viewBox="0 0 1 1"><g xmlns="http://evil.test/ns"><path d="M0 0"/></g></svg>`
    );
    assert.doesNotMatch(markup, /evil\.test/);
    assert.match(markup, /<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  });

  it("names what it refuses", () =>
    isRejected(
      `<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>`,
      /<script>/
    ));

  it("rejects event handlers", () =>
    isRejected(`<svg viewBox="0 0 1 1" onload="alert(1)"/>`, /onload/));

  it("rejects foreignObject, embedded images and links", () => {
    isRejected(
      `<svg viewBox="0 0 1 1"><foreignObject><div/></foreignObject></svg>`
    );
    isRejected(
      `<svg viewBox="0 0 1 1"><image href="data:image/png;base64,AAA"/></svg>`
    );
    isRejected(
      `<svg viewBox="0 0 1 1"><a href="#x"><path d="M0 0"/></a></svg>`
    );
    isRejected(
      `<svg viewBox="0 0 1 1"><filter><feImage href="#x"/></filter></svg>`
    );
  });

  it("rejects external and javascript references", () => {
    isRejected(
      `<svg viewBox="0 0 1 1"><use href="https://evil.test/x.svg#a"/></svg>`
    );
    isRejected(
      `<svg viewBox="0 0 1 1"><use xlink:href="javascript:alert(1)"/></svg>`
    );
  });

  it("rejects external resources in styles, escaped or not", () => {
    isRejected(
      `<svg viewBox="0 0 1 1"><style>@import url(https://evil.test/a.css);</style></svg>`
    );
    isRejected(
      `<svg viewBox="0 0 1 1"><path style="fill:url(https://evil.test/p)"/></svg>`
    );
    isRejected(
      `<svg viewBox="0 0 1 1"><style>@\\69mport "https://evil.test/a.css";</style></svg>`
    );
    isRejected(
      `<svg viewBox="0 0 1 1"><path style="fill:\\75rl(https://evil.test/p)"/></svg>`
    );
    isRejected(
      `<svg viewBox="0 0 1 1"><path style="fill:image-set('https://evil.test/p' 1x)"/></svg>`
    );
  });

  it("rejects processing instructions such as stylesheets", () =>
    isRejected(
      `<?xml-stylesheet href="https://evil.test/a.css"?><svg viewBox="0 0 1 1"/>`,
      /processing instruction/
    ));

  it("rejects entity declarations", () =>
    isRejected(`<!DOCTYPE svg [<!ENTITY x "y">]><svg viewBox="0 0 1 1"/>`));

  it("rejects an SVG without a usable size", () => {
    isRejected(`<svg><path d="M0 0"/></svg>`);
    isRejected(`<svg viewBox="0 0 1e400 10"><path d="M0 0"/></svg>`);
  });
});
