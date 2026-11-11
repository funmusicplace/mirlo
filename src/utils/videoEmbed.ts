const YOUTUBE_ID = /^[\w-]{11}$/;
const VIMEO_ID = /^\d+$/;
const VIMEO_HASH = /^[\da-f]+$/i;

const youtubeId = (host: string, url: URL, segments: string[]) => {
  if (host === "youtu.be") {
    return segments[0];
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (segments[0] === "watch") {
      return url.searchParams.get("v");
    }
    if (["embed", "shorts", "live"].includes(segments[0])) {
      return segments[1];
    }
  }
};

const vimeoEmbedUrl = (host: string, url: URL, segments: string[]) => {
  const [id, hash = url.searchParams.get("h")] =
    host === "player.vimeo.com" && segments[0] === "video"
      ? segments.slice(1)
      : host === "vimeo.com"
        ? segments
        : [];
  if (!id || !VIMEO_ID.test(id)) {
    return null;
  }
  return `https://player.vimeo.com/video/${id}${
    hash && VIMEO_HASH.test(hash) ? `?h=${hash}` : ""
  }`;
};

export const videoEmbedUrl = (link?: string | null) => {
  let url: URL;
  try {
    url = new URL(link?.trim() ?? "");
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const host = url.hostname.replace(/^(www|m)\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  const id = youtubeId(host, url, segments);
  if (id !== undefined) {
    return id && YOUTUBE_ID.test(id)
      ? `https://www.youtube.com/embed/${id}`
      : null;
  }
  return vimeoEmbedUrl(host, url, segments);
};
