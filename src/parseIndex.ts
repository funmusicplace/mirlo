import path from "node:path";
import fs from "fs";
import * as cheerio from "cheerio";

const parseIndex = (pathname: string) => {
  const fileLocation = path.join(__dirname, "..", "client", "dist", pathname);
  console.log("ls", fs.readdirSync("/var/www/api/client/dist/"));
  console.log("fileLocation", fileLocation);
  const buffer = fs.readFileSync(pathname);
  const $ = cheerio.load(buffer);
  console.log("parsing");

  $("head").append(`
    <meta property="og:type" content="article">
    <meta property="og:title" content="{{  }}">
    <meta property="og:description" content="{{ .Summary | plainify }}">
    <meta property="og:url" content="{{ .Permalink }}">
    <meta property="og:image" content="{{ .Site.BaseURL }}{{ .Params.cover }}" />
  `);
  return $.html();
};

export default parseIndex;
