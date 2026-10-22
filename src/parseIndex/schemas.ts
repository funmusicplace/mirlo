import { PageMetadata } from "../parseIndex";

import { serializeForScript } from "./hydrations";

const datePublished = (releaseDate?: string) =>
  releaseDate || new Date().toISOString().split("T")[0];

// Build MusicAlbum schema for albums
export const buildMusicAlbumSchema = (metadata: PageMetadata): string => {
  const {
    title,
    description,
    url,
    imageUrl,
    artistName,
    artistUrl,
    releaseDate,
    trackCount = 0,
    tracks = [],
  } = metadata;

  return serializeForScript({
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: title,
    description,
    url,
    image: imageUrl || "",
    byArtist: {
      "@type": "MusicGroup",
      name: artistName || "",
      url: artistUrl || "",
    },
    datePublished: datePublished(releaseDate),
    numberOfTracks: trackCount,
    track: tracks.map((track, index) => ({
      "@type": "MusicRecording",
      position: index + 1,
      name: track.title,
      url: track.url,
      ...(track.duration && { duration: `PT${track.duration}S` }),
    })),
  });
};

// Build MusicRecording schema for individual tracks
export const buildMusicRecordingSchema = (metadata: PageMetadata): string => {
  const {
    title,
    description,
    url,
    imageUrl,
    artistName,
    artistUrl,
    releaseDate,
    duration,
  } = metadata;

  return serializeForScript({
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: title,
    description,
    url,
    image: imageUrl || "",
    ...(duration && { duration: `PT${duration}S` }),
    byArtist: {
      "@type": "MusicGroup",
      name: artistName || "",
      url: artistUrl || "",
    },
    datePublished: datePublished(releaseDate),
  });
};

// Build MusicGroup schema for artist profiles
export const buildMusicGroupSchema = (metadata: PageMetadata): string => {
  const { title, description, url, imageUrl, artistUrl } = metadata;

  return serializeForScript({
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: title,
    description,
    url: artistUrl || url,
    image: imageUrl || "",
  });
};

// Build BlogPosting schema for posts and general articles
export const buildArticleSchema = (metadata: PageMetadata): string => {
  const { title, description, url, imageUrl, artistName, releaseDate } =
    metadata;

  return serializeForScript({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url,
    image: imageUrl || "",
    author: {
      "@type": "Person",
      name: artistName || "Mirlo Artist",
    },
    datePublished: datePublished(releaseDate),
  });
};
