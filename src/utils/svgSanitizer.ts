import * as cheerio from "cheerio";

import { AppError, HttpCode } from "./error";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

const SVG_ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "symbol",
  "use",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "text",
  "tspan",
  "textPath",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "style",
  "title",
  "desc",
]);

const SVG_ATTRIBUTES = new Set([
  "id",
  "class",
  "style",
  "type",
  "version",
  "baseProfile",
  "xmlns",
  "xmlns:xlink",
  "xmlns:svg",
  "xml:space",
  "xml:lang",
  "viewBox",
  "preserveAspectRatio",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "fx",
  "fy",
  "dx",
  "dy",
  "d",
  "points",
  "transform",
  "fill",
  "fill-opacity",
  "fill-rule",
  "clip-rule",
  "clip-path",
  "clipPathUnits",
  "mask",
  "maskUnits",
  "maskContentUnits",
  "opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "paint-order",
  "vector-effect",
  "shape-rendering",
  "text-rendering",
  "enable-background",
  "overflow",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "refX",
  "refY",
  "orient",
  "marker-start",
  "marker-mid",
  "marker-end",
  "filter",
  "filterUnits",
  "primitiveUnits",
  "color-interpolation-filters",
  "in",
  "in2",
  "result",
  "mode",
  "operator",
  "k1",
  "k2",
  "k3",
  "k4",
  "values",
  "stdDeviation",
  "radius",
  "flood-color",
  "flood-opacity",
  "tableValues",
  "slope",
  "intercept",
  "amplitude",
  "exponent",
  "href",
  "xlink:href",
  "display",
  "visibility",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "word-spacing",
  "text-decoration",
  "baseline-shift",
  "textLength",
  "lengthAdjust",
  "startOffset",
  "focusable",
  "tabindex",
  "text-anchor",
  "dominant-baseline",
  "role",
  "aria-hidden",
  "aria-label",
]);

const EDITOR_NAMESPACES = [
  "inkscape:",
  "sodipodi:",
  "sketch:",
  "serif:",
  "osb:",
];
const EDITOR_ELEMENTS = new Set(["metadata", "sodipodi:namedview"]);
const KEPT_NAMESPACE_DECLARATIONS = new Set(["xmlns:xlink", "xmlns:svg"]);

const UNSAFE_CSS = [
  /\\/,
  /@import/i,
  /url\(\s*['"]?\s*(?!#)/i,
  /(image-set|image|cross-fade|element|expression)\(/i,
];

const SVG_PROLOG_REGEX =
  /^\s*(<\?xml[\s?][^>]*>\s*)?((<!--[\s\S]*?-->|<!DOCTYPE[^>[]*>)\s*)*<svg[\s>]/i;

export const isSvgMarkup = (text: string) => SVG_PROLOG_REGEX.test(text);

const rejectSvg = (name: string) =>
  new AppError({
    httpCode: HttpCode.BAD_REQUEST,
    description: `This SVG contains something that is not allowed: ${name}. Export it again with plain shapes.`,
  });

const parseLength = (value: string | undefined) => {
  const length = Number.parseFloat(value ?? "");
  return Number.isFinite(length) && length > 0 ? length : undefined;
};

const svgDimensions = (attributes: Record<string, string>) => {
  const viewBox = (attributes.viewBox ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    viewBox.length === 4 &&
    viewBox.every(Number.isFinite) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0
  ) {
    return { width: viewBox[2], height: viewBox[3] };
  }
  const width = parseLength(attributes.width);
  const height = parseLength(attributes.height);
  return width && height ? { width, height } : undefined;
};

const isEditorName = (name: string) =>
  EDITOR_NAMESPACES.some((namespace) => name.startsWith(namespace)) ||
  (name.startsWith("xmlns:") && !KEPT_NAMESPACE_DECLARATIONS.has(name)) ||
  name.startsWith("data-");

const isUnsafeCss = (value: string) =>
  UNSAFE_CSS.some((pattern) => pattern.test(value));

const checkAttribute = (name: string, value: string) => {
  if (!SVG_ATTRIBUTES.has(name)) {
    throw rejectSvg(`the ${name} attribute`);
  }
  if ((name === "href" || name === "xlink:href") && !value.startsWith("#")) {
    throw rejectSvg(`a link to ${value}`);
  }
  if (isUnsafeCss(value)) {
    throw rejectSvg(`the value of the ${name} attribute`);
  }
};

export const sanitizeSvg = (text: string) => {
  if (/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(text)) {
    throw rejectSvg("an entity declaration");
  }
  if (/<\?(?!xml[\s?])/i.test(text)) {
    throw rejectSvg("a processing instruction");
  }
  const $ = cheerio.load(text, { xml: true });
  const roots = $.root().children().toArray();
  const root = roots[0];
  if (roots.length !== 1 || !("tagName" in root) || root.tagName !== "svg") {
    throw rejectSvg("content outside the svg element");
  }

  const elements = () =>
    $("*")
      .toArray()
      .filter((node) => "tagName" in node);

  for (const element of elements()) {
    if (EDITOR_ELEMENTS.has(element.tagName) || isEditorName(element.tagName)) {
      $(element).remove();
    }
  }

  for (const element of elements()) {
    if (!SVG_ELEMENTS.has(element.tagName)) {
      throw rejectSvg(`<${element.tagName}>`);
    }
    for (const [name, value] of Object.entries(element.attribs)) {
      if (isEditorName(name)) {
        $(element).removeAttr(name);
      } else {
        checkAttribute(name, value);
      }
    }
    if (element.tagName === "style" && isUnsafeCss($(element).text())) {
      throw rejectSvg("the content of a <style> element");
    }
  }

  const dimensions = svgDimensions(root.attribs);
  if (!dimensions) {
    throw new AppError({
      httpCode: HttpCode.BAD_REQUEST,
      description:
        "This SVG has no size. Export it again with a viewBox or a width and height.",
    });
  }

  $(root).attr("xmlns", SVG_NAMESPACE);
  if ($("[xlink\\:href]").length > 0) {
    $(root).attr("xmlns:xlink", XLINK_NAMESPACE);
  }

  return { markup: $.xml(), ...dimensions };
};
