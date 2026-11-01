import { Readable, pipeline } from "node:stream";

import prisma from "@mirlo/prisma";
import cors from "cors";
import express, { Request, Response } from "express";
import { groupBy, shuffle } from "lodash";

import logger from "../../logger";
import {
  albumYear,
  audioContentType,
  parseSubsonicId,
  serializeAlbum,
  serializeAlbumWithSongs,
  serializeArtist,
  serializeSong,
} from "../../serializers/subsonic";
import { whereForVisibleProfile } from "../../utils/artist";
import { storedImageVariantUrl } from "../../utils/images";
import {
  presignOriginalAudio,
  statAudioSegment,
  streamOriginalAudio,
} from "../../utils/minio";
import { authenticateSubsonic } from "../../utils/subsonicCredentials";
import {
  LibraryAlbum,
  findOwnedTrack,
  loadLibrary,
  whereForOwnedTrackGroup,
} from "../../utils/subsonicLibrary";

import { SubsonicError, SubsonicParams, respond } from "./respond";

type Context = { userId: number; params: SubsonicParams };
type Redirect = { redirect: string };
type AudioFile = { stream: Readable; extension: string };
type Handler = (
  context: Context
) => Promise<Record<string, unknown> | Redirect | AudioFile>;
type PublicHandler = () => Promise<Record<string, unknown>>;

const isRedirect = (result: object): result is Redirect =>
  "redirect" in result && typeof result.redirect === "string";

const isAudioFile = (result: object): result is AudioFile =>
  "stream" in result && result.stream instanceof Readable;

const required = (params: SubsonicParams, name: string) => {
  const value = params[name];
  if (value === undefined) {
    throw new SubsonicError(10);
  }
  return value;
};

const intParam = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : Math.max(parsed, 0);
};

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

const newestFirst = (a: LibraryAlbum, b: LibraryAlbum) =>
  b.addedAt.getTime() - a.addedAt.getTime();

const byTitle = (a: LibraryAlbum, b: LibraryAlbum) =>
  (a.trackGroup.title ?? "").localeCompare(b.trackGroup.title ?? "");

const byArtistThenTitle = (a: LibraryAlbum, b: LibraryAlbum) =>
  a.trackGroup.profile.name.localeCompare(b.trackGroup.profile.name) ||
  byTitle(a, b);

const artistGroups = (library: LibraryAlbum[]) =>
  Object.values(groupBy(library, ({ trackGroup }) => trackGroup.profileId)).map(
    (albums) => ({ profile: albums[0].trackGroup.profile, albums })
  );

// Artists are indexed by their first letter, anything else goes under "#"
const indexLetter = (name: string) =>
  name
    .trim()
    .match(/^\p{L}/u)?.[0]
    .toUpperCase() ?? "#";

const sortAlbums = (
  library: LibraryAlbum[],
  type: string,
  params: SubsonicParams
) => {
  switch (type) {
    case "newest":
    case "recent":
      return [...library].sort(newestFirst);
    // Mirlo has no favorites or play counts over Subsonic
    case "frequent":
    case "highest":
    case "starred":
      return [];
    case "alphabeticalByName":
      return [...library].sort(byTitle);
    case "alphabeticalByArtist":
      return [...library].sort(byArtistThenTitle);
    case "random":
      return shuffle(library);
    case "byYear": {
      const from = intParam(params.fromYear, 0);
      const to = intParam(params.toYear, Infinity);
      return library
        .filter((album) => {
          const year = albumYear(album);
          return year !== undefined && year >= from && year <= to;
        })
        .sort(newestFirst);
    }
    default:
      throw new SubsonicError(0, 200, "Unsupported list type.");
  }
};

const coverImage = async (id: string) => {
  const trackGroupId = parseSubsonicId("al", id);
  if (trackGroupId !== undefined) {
    const trackGroup = await prisma.trackGroup.findFirst({
      where: { id: trackGroupId, ...whereForOwnedTrackGroup() },
      select: { cover: true },
    });
    return trackGroup?.cover;
  }
  const profileId = parseSubsonicId("ar", id);
  if (profileId !== undefined) {
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, ...whereForVisibleProfile() },
      select: { avatar: true },
    });
    return profile?.avatar;
  }
};

// Hands the app a short-lived storage URL for the original upload so audio
// bytes don't flow through this server, and pipes the file where presigning
// isn't available (local MinIO without a public endpoint)
const audioLocation: Handler = async ({ userId, params }) => {
  const trackId = parseSubsonicId("tr", required(params, "id"));
  const track =
    trackId === undefined ? null : await findOwnedTrack(userId, trackId);
  const audio = track?.audio;
  if (audio?.uploadState !== "SUCCESS" || !audio.fileExtension) {
    throw new SubsonicError(70, 404);
  }
  const extension = audio.fileExtension;
  const url = await presignOriginalAudio(audio.id, extension);
  if (url) {
    return { redirect: url };
  }
  const { minioStat, backblazeStat } = await statAudioSegment(
    audio.id,
    `original.${extension}`
  );
  const stream =
    minioStat || backblazeStat
      ? await streamOriginalAudio(audio.id, extension)
      : undefined;
  if (!stream) {
    throw new SubsonicError(70, 404);
  }
  return { stream, extension };
};

const handlers: Record<string, Handler> = {
  ping: async () => ({}),

  getLicense: async () => ({ license: { valid: true } }),

  getMusicFolders: async () => ({
    musicFolders: { musicFolder: [{ id: 1, name: "Collection" }] },
  }),

  getArtists: async ({ userId }) => {
    const artists = artistGroups(await loadLibrary(userId))
      .map(({ profile, albums }) => serializeArtist(profile, albums.length))
      .sort(byName);
    const index = Object.entries(
      groupBy(artists, (artist) => indexLetter(artist.name))
    )
      .map(([name, artist]) => ({ name, artist }))
      .sort(byName);
    return { artists: { ignoredArticles: "", index } };
  },

  getArtist: async ({ userId, params }) => {
    const profileId = parseSubsonicId("ar", required(params, "id"));
    const library =
      profileId === undefined ? [] : await loadLibrary(userId, { profileId });
    const [found] = artistGroups(library.sort(newestFirst));
    if (!found) {
      throw new SubsonicError(70);
    }
    return {
      artist: {
        ...serializeArtist(found.profile, found.albums.length),
        album: found.albums.map(serializeAlbum),
      },
    };
  },

  getAlbumList2: async ({ userId, params }) => {
    const type = required(params, "type");
    const albums = sortAlbums(await loadLibrary(userId), type, params);
    const offset = intParam(params.offset, 0);
    const size = Math.min(intParam(params.size, 10), 500);
    return {
      albumList2: {
        album: albums.slice(offset, offset + size).map(serializeAlbum),
      },
    };
  },

  getAlbum: async ({ userId, params }) => {
    const trackGroupId = parseSubsonicId("al", required(params, "id"));
    const [album] =
      trackGroupId === undefined
        ? []
        : await loadLibrary(userId, { trackGroupId });
    if (!album) {
      throw new SubsonicError(70);
    }
    return { album: serializeAlbumWithSongs(album) };
  },

  search3: async ({ userId, params }) => {
    // Clients send "" to list everything
    const needle = required(params, "query")
      .replace(/^"(.*)"$/, "$1")
      .toLowerCase();
    const matches = (...texts: (string | null)[]) =>
      texts.some((text) => text?.toLowerCase().includes(needle));
    const paged = <T>(kind: "artist" | "album" | "song", items: T[]) => {
      const offset = intParam(params[`${kind}Offset`], 0);
      return items.slice(offset, offset + intParam(params[`${kind}Count`], 20));
    };

    const library = (await loadLibrary(userId)).sort(newestFirst);
    const artists = artistGroups(library)
      .filter(({ profile }) => matches(profile.name))
      .map(({ profile, albums }) => serializeArtist(profile, albums.length))
      .sort(byName);
    const albums = library.filter(({ trackGroup }) =>
      matches(trackGroup.title, trackGroup.profile.name)
    );
    const songs = library.flatMap((album) =>
      album.tracks
        .filter((track) =>
          matches(
            track.title,
            album.trackGroup.title,
            album.trackGroup.profile.name
          )
        )
        .map((track) => ({ track, album }))
    );
    return {
      searchResult3: {
        artist: paged("artist", artists),
        album: paged("album", albums).map(serializeAlbum),
        song: paged("song", songs).map(({ track, album }) =>
          serializeSong(track, album)
        ),
      },
    };
  },

  getCoverArt: async ({ params }) => {
    const image = await coverImage(required(params, "id"));
    const url = storedImageVariantUrl(image, intParam(params.size, Infinity), {
      atLeast: true,
    });
    if (!url) {
      throw new SubsonicError(70, 404);
    }
    return { redirect: url };
  },

  stream: audioLocation,
  download: audioLocation,
};

// Clients read the extension list before they have credentials
const publicHandlers: Record<string, PublicHandler> = {
  getOpenSubsonicExtensions: async () => ({
    openSubsonicExtensions: [
      { name: "formPost", versions: [1] },
      { name: "apiKeyAuthentication", versions: [1] },
    ],
  }),
};

// Parameters come in the query string or, with the formPost extension, in a
// form body
const requestParams = (req: Request) => {
  const params: SubsonicParams = {};
  for (const source of [req.query, req.body]) {
    for (const [key, value] of Object.entries(source ?? {})) {
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first === "string") {
        params[key] = first;
      }
    }
  }
  return params;
};

const router = express.Router();

// Credentials travel in the parameters and no cookie is involved, so any
// origin may call
router.use(cors());
router.use(express.urlencoded({ extended: false }));

router.all("/rest/:method", async (req: Request, res: Response) => {
  const params = requestParams(req);
  try {
    const method = req.params.method.replace(/\.view$/, "");
    if (Object.hasOwn(publicHandlers, method)) {
      respond(res, params, await publicHandlers[method]());
      return;
    }
    const auth = await authenticateSubsonic(params);
    if ("error" in auth) {
      throw new SubsonicError(auth.error);
    }
    if (!Object.hasOwn(handlers, method)) {
      throw new SubsonicError(0, 200, "Unsupported method.");
    }
    const result = await handlers[method]({ userId: auth.userId, params });
    if (isRedirect(result)) {
      res.redirect(result.redirect);
    } else if (isAudioFile(result)) {
      res.type(
        audioContentType(result.extension) ?? "application/octet-stream"
      );
      pipeline(result.stream, res, (e) => {
        if (e) {
          (req.logger ?? logger).warn(`subsonic ${method} ended early`, e);
        }
      });
    } else {
      respond(res, params, result);
    }
  } catch (e) {
    if (e instanceof SubsonicError) {
      respond(res, params, e);
    } else {
      (req.logger ?? logger).error(`subsonic ${req.params.method} failed`, e);
      respond(res, params, new SubsonicError(0, 500));
    }
  }
});

export default router;
