import { PageMetadata } from "../parseIndex";

// Helper function to safely escape strings for JSON
const escapeJsonString = (str: string): string => {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
};

// Build MusicAlbum schema for albums
export const buildMusicAlbumSchema = (metadata: PageMetadata): string => {
  const {
    title,
    description,
    url,
    imageUrl,
    artistName,
    profileUrl,
    releaseDate,
    trackCount = 0,
    tracks = [],
  } = metadata;

  const trackListItems = tracks
    .map(
      (track, index) => `{
      "@type": "MusicRecording",
      "position": ${index + 1},
      "name": "${escapeJsonString(track.title)}",
      "url": "${track.url}"
      ${track.duration ? `,"duration": "PT${track.duration}S"` : ""}
    }`
    )
    .join(",");

  return `{
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "name": "${escapeJsonString(title)}",
    "description": "${escapeJsonString(description)}",
    "url": "${url}",
    "image": "${imageUrl || ""}",
    "byArtist": {
      "@type": "MusicGroup",
      "name": "${escapeJsonString(artistName || "")}",
      "url": "${profileUrl || ""}"
    },
    "datePublished": "${releaseDate || new Date().toISOString().split("T")[0]}",
    "numberOfTracks": ${trackCount},
    "track": [${trackListItems}]
  }`;
};

// Build MusicRecording schema for individual tracks
export const buildMusicRecordingSchema = (metadata: PageMetadata): string => {
  const {
    title,
    description,
    url,
    imageUrl,
    artistName,
    profileUrl,
    releaseDate,
    duration,
  } = metadata;

  const durationString = duration ? `"duration": "PT${duration}S",` : "";

  return `{
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": "${escapeJsonString(title)}",
    "description": "${escapeJsonString(description)}",
    "url": "${url}",
    "image": "${imageUrl || ""}",
    ${durationString}
    "byArtist": {
      "@type": "MusicGroup",
      "name": "${escapeJsonString(artistName || "")}",
      "url": "${profileUrl || ""}"
    },
    "datePublished": "${releaseDate || new Date().toISOString().split("T")[0]}"
  }`;
};

// Build MusicGroup schema for artist profiles
export const buildMusicGroupSchema = (metadata: PageMetadata): string => {
  const { title, description, url, imageUrl, profileUrl } = metadata;

  return `{
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "name": "${escapeJsonString(title)}",
    "description": "${escapeJsonString(description)}",
    "url": "${profileUrl || url}",
    "image": "${imageUrl || ""}"
  }`;
};

// Build BlogPosting schema for posts and general articles
export const buildArticleSchema = (metadata: PageMetadata): string => {
  const { title, description, url, imageUrl, artistName, releaseDate } =
    metadata;

  return `{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${escapeJsonString(title)}",
    "description": "${escapeJsonString(description)}",
    "url": "${url}",
    "image": "${imageUrl || ""}",
    "author": {
      "@type": "Person",
      "name": "${escapeJsonString(artistName || "Mirlo Artist")}"
    },
    "datePublished": "${releaseDate || new Date().toISOString().split("T")[0]}"
  }`;
};
