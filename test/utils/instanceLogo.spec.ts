import assert from "node:assert";

import { describe, it } from "mocha";
import sharp from "sharp";

import { processLogo } from "../../src/utils/instanceLogo";

describe("processLogo", () => {
  it("scales a PNG down to fit 600x200 and keeps it a PNG", async () => {
    const png = await sharp({
      create: {
        width: 1200,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const logo = await processLogo(png);

    assert.equal(logo.mimeType, "image/png");
    assert.equal(logo.width, 600);
    assert.equal(logo.height, 50);
    const { hasAlpha } = await sharp(logo.buffer).metadata();
    assert.equal(hasAlpha, true);
  });

  it("refuses a PNG that decodes to too many pixels", async () => {
    const png = await sharp({
      create: { width: 8000, height: 8000, channels: 3, background: "#000" },
    })
      .png({ palette: true, colours: 2 })
      .toBuffer();

    await assert.rejects(
      processLogo(png),
      (e: { httpCode: number }) => e.httpCode === 400
    );
  });

  it("rejects a file that is neither PNG nor SVG", async () => {
    await assert.rejects(
      processLogo(Buffer.from("GIF89a")),
      (e: { httpCode: number }) => e.httpCode === 400
    );
  });
});
