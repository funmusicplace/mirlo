import { Image, Profile } from "@mirlo/prisma/client";
import { lookup } from "mime-types";

import { storedImageVariantUrl } from "../utils/images";
import { LibraryAlbum, LibraryTrack } from "../utils/subsonicLibrary";

import { trackDuration } from "./track";

// Ids carry a prefix so one string tells albums, songs and artists apart
export const albumId = (id: number) => `al-${id}`;
export const songId = (id: number) => `tr-${id}`;
export const artistId = (id: number) => `ar-${id}`;

// Nine digits at most, so the id always fits the Int column
export const parseSubsonicId = (prefix: "al" | "tr" | "ar", id?: string) => {
  const rest = id?.startsWith(`${prefix}-`) ? id.slice(prefix.length + 1) : "";
  return /^\d{1,9}$/.test(rest) ? Number(rest) : undefined;
};

export const audioContentType = (extension?: string | null) =>
  (extension && lookup(extension)) || undefined;

export const albumYear = ({ trackGroup }: LibraryAlbum) =>
  trackGroup.releaseDate?.getUTCFullYear();

const songDuration = (track: LibraryTrack) =>
  Math.round(trackDuration(track) ?? 0);

// ArtistID3 from https://subsonic.org/pages/api.jsp
export const serializeArtist = (
  profile: Profile & { avatar?: Image | null },
  albumCount: number
) => ({
  id: artistId(profile.id),
  name: profile.name,
  coverArt: profile.avatar ? artistId(profile.id) : undefined,
  artistImageUrl: storedImageVariantUrl(profile.avatar, 600),
  albumCount,
});

// Child
export const serializeSong = (track: LibraryTrack, album: LibraryAlbum) => {
  const { trackGroup } = album;
  const suffix = track.audio?.fileExtension ?? undefined;
  return {
    id: songId(track.id),
    parent: albumId(trackGroup.id),
    isDir: false,
    title: track.title ?? "",
    album: trackGroup.title ?? undefined,
    artist: trackGroup.profile.name,
    track: track.order,
    year: albumYear(album),
    coverArt: trackGroup.cover ? albumId(trackGroup.id) : undefined,
    size: track.audio?.size ?? undefined,
    contentType: audioContentType(suffix),
    suffix,
    duration: songDuration(track),
    created: track.createdAt,
    albumId: albumId(trackGroup.id),
    artistId: artistId(trackGroup.profileId),
    type: "music",
    mediaType: "song",
  };
};

// AlbumID3
export const serializeAlbum = (album: LibraryAlbum) => {
  const { trackGroup } = album;
  return {
    id: albumId(trackGroup.id),
    name: trackGroup.title ?? "",
    artist: trackGroup.profile.name,
    artistId: artistId(trackGroup.profileId),
    coverArt: trackGroup.cover ? albumId(trackGroup.id) : undefined,
    songCount: album.tracks.length,
    duration: album.tracks.reduce(
      (total, track) => total + songDuration(track),
      0
    ),
    created: album.addedAt,
    year: albumYear(album),
  };
};

export const serializeAlbumWithSongs = (album: LibraryAlbum) => ({
  ...serializeAlbum(album),
  song: album.tracks.map((track) => serializeSong(track, album)),
});
