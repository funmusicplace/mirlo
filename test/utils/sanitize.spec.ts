import assert from "assert";

import { describe, it } from "mocha";

import {
  stripNullBytes,
  stripNullBytesFromObject,
} from "../../src/utils/sanitize";

const NUL = String.fromCharCode(0);

describe("stripNullBytes", () => {
  it("removes a single null byte from a string", () => {
    assert.equal(stripNullBytes(`hello${NUL}world`), "helloworld");
  });

  it("removes multiple null bytes", () => {
    assert.equal(stripNullBytes(`${NUL}a${NUL}b${NUL}`), "ab");
  });

  it("returns the string unchanged when there are no null bytes", () => {
    assert.equal(stripNullBytes("normal string"), "normal string");
  });

  it("returns an empty string unchanged", () => {
    assert.equal(stripNullBytes(""), "");
  });

  it("passes null through as null", () => {
    assert.equal(stripNullBytes(null), null);
  });

  it("passes undefined through as undefined", () => {
    assert.equal(stripNullBytes(undefined), undefined);
  });
});

describe("stripNullBytesFromObject", () => {
  it("strips null bytes from a flat object's string values", () => {
    const input = { title: `track${NUL}`, isrc: `AB${NUL}CD` };
    const result = stripNullBytesFromObject(input) as typeof input;
    assert.deepEqual(result, { title: "track", isrc: "ABCD" });
  });

  it("strips null bytes recursively from nested objects", () => {
    const input = { common: { title: `a${NUL}b`, genre: `rock${NUL}` } };
    const result = stripNullBytesFromObject(input) as typeof input;
    assert.deepEqual(result, { common: { title: "ab", genre: "rock" } });
  });

  it("strips null bytes from strings inside arrays", () => {
    const input = [`a${NUL}`, `b${NUL}c`];
    const result = stripNullBytesFromObject(input) as string[];
    assert.deepEqual(result, ["a", "bc"]);
  });

  it("strips null bytes from object values that are arrays", () => {
    const input = { artists: [`Art${NUL}ist`, "Other"] };
    const result = stripNullBytesFromObject(input) as typeof input;
    assert.deepEqual(result, { artists: ["Artist", "Other"] });
  });

  it("leaves non-string values untouched", () => {
    const input = { order: 1, isPreview: true, minPrice: 9.99 };
    const result = stripNullBytesFromObject(input);
    assert.deepEqual(result, { order: 1, isPreview: true, minPrice: 9.99 });
  });

  it("passes null through as null", () => {
    assert.equal(stripNullBytesFromObject(null), null);
  });

  it("passes undefined through as undefined", () => {
    assert.equal(stripNullBytesFromObject(undefined), undefined);
  });

  it("handles an empty object", () => {
    assert.deepEqual(stripNullBytesFromObject({}), {});
  });

  it("handles an empty array", () => {
    assert.deepEqual(stripNullBytesFromObject([]), []);
  });
});
