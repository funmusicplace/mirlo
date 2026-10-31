import { trackDuration } from "./track";

type SubsonicTrack = Parameters<typeof trackDuration>[0] & {
  id: number;
  title: string | null;
  order: number;
};

type SubsonicAlbum = {
  id: number;
  title: string | null;
  createdAt: Date;
  releaseDate: Date | null;
  coverImageId: string | null;
  artistId?: number;
  artist?: { name?: string };
  tracks?: SubsonicTrack[];
};

// Child and AlbumID3 shapes from https://subsonic.org/pages/api.jsp
const serializeTrackIntoSubsonic = (
  track: SubsonicTrack,
  album: SubsonicAlbum
) => ({
  id: String(track.id),
  parent: String(album.id),
  isDir: false,
  title: track.title ?? "",
  album: album.title ?? undefined,
  artist: album.artist?.name,
  track: track.order,
  year: album.releaseDate?.getFullYear(),
  coverArt: album.coverImageId ?? undefined,
  duration: Math.round(trackDuration(track) ?? 0),
  albumId: String(album.id),
  artistId: album.artistId?.toString(),
  type: "music",
});

export const serializeTrackGroupIntoSubsonic = (
  album: SubsonicAlbum,
  tracks = album.tracks ?? []
) => {
  const song = tracks.map((track) => serializeTrackIntoSubsonic(track, album));
  return {
    id: String(album.id),
    name: album.title ?? "",
    artist: album.artist?.name,
    artistId: album.artistId?.toString(),
    coverArt: album.coverImageId ?? undefined,
    songCount: song.length,
    duration: song.reduce((total, s) => total + s.duration, 0),
    created: album.createdAt,
    year: album.releaseDate?.getFullYear(),
    song,
  };
};

export const subsonicResponse = (body: Record<string, unknown>) => ({
  "subsonic-response": { status: "ok", version: "1.16.1", ...body },
});
