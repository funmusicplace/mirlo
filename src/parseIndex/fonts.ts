import * as cheerio from "cheerio";
import { uniqBy } from "lodash";

import { InstanceSettings } from "../serializers/instanceSettings";
import { regularFontFile } from "../utils/fontCss";

export const instanceFontVariables = ({
  heading,
  body,
}: InstanceSettings["fonts"]) =>
  [
    heading && `--mi-instance-font-heading: ${heading.stack};`,
    body && `--mi-instance-font-body: ${body.stack};`,
  ]
    .filter(Boolean)
    .join("\n");

export const appendInstanceFontFaces = (
  $: cheerio.CheerioAPI,
  { heading, body }: InstanceSettings["fonts"]
) => {
  const fonts = uniqBy(
    [heading, body].filter((font) => font !== null),
    "id"
  );
  for (const font of fonts) {
    $("head").append(
      `<style data-font-id="${font.id}" data-font-files="${font.files.map((file) => file.id).join(" ")}">${font.css}</style>`
    );
  }
  const preloaded = body && regularFontFile(body.files);
  if (preloaded) {
    $("head").append(
      $("<link>").attr({
        rel: "preload",
        as: "font",
        type: `font/${preloaded.format}`,
        href: preloaded.url,
        crossorigin: "",
      })
    );
  }
};
