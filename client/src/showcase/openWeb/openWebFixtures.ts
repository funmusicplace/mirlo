import { bypass, http, HttpResponse, passthrough } from "msw";

import {
  COVERS,
  RELEASES,
  SHOWCASE_ARTIST,
  SHOWCASE_ARTIST_WITH_RELEASES,
} from "../shared/fixtures";

const STREAM_PATH = "/v1/showcase-audio/ambient.m3u8";

const playable = (track: Track): Track => ({
  ...track,
  audio: { ...track.audio!, url: STREAM_PATH },
});

const PLAYABLE_RELEASES: TrackGroup[] = Object.values(RELEASES).map(
  (release) => ({ ...release, tracks: release.tracks.map(playable) })
);

const [TIDAL, MOSS, EMBER] = PLAYABLE_RELEASES;

export const audioHandlers = [
  http.get(`*${STREAM_PATH}`, async () => {
    const audioRoot = `${window.location.origin}/showcase/audio/`;
    const playlist = await fetch(bypass(`${audioRoot}ambient.m3u8`)).then((r) =>
      r.text()
    );
    return new HttpResponse(
      playlist.replace(/^(ambient-\d+\.ts)$/gm, `${audioRoot}$1`),
      { headers: { "Content-Type": "application/vnd.apple.mpegurl" } }
    );
  }),
  http.get("*/showcase/audio/*", () => passthrough()),
  http.post("*/v1/tracks/:id/trackPlay", () => HttpResponse.json({})),
];

const tier = (
  overrides: Partial<ArtistSubscriptionTier>
): ArtistSubscriptionTier => ({
  id: 1,
  artistId: SHOWCASE_ARTIST.id,
  artist: SHOWCASE_ARTIST,
  name: "follow",
  description: "",
  interval: "MONTH",
  isDefaultTier: false,
  platformPercent: 7,
  images: [],
  ...overrides,
});

/** Lumen Tide as the public API returns it, with tiers and payouts set up */
export const OPEN_WEB_ARTIST: Artist = {
  ...SHOWCASE_ARTIST_WITH_RELEASES,
  user: { id: SHOWCASE_ARTIST.userId, currency: "usd" },
  activityPub: true,
  subscriptionTiers: [
    tier({ id: 701, name: "follow", isDefaultTier: true }),
    tier({
      id: 702,
      name: "Harbour Club",
      minAmount: 500,
      description: "Early demos and a monthly tape-loop diary.",
    }),
    tier({
      id: 703,
      name: "Lighthouse Keeper",
      minAmount: 1500,
      description: "Everything, plus a hand-numbered cassette each season.",
    }),
  ],
};

/** A post with three songs attached, for the post widget */
export const OPEN_WEB_POST: Post = {
  id: 7101,
  urlSlug: "boathouse-sessions",
  title: "Boathouse sessions: three unfinished songs",
  content:
    "<p>We spent February in the boathouse again. Here are three sketches that didn't make the record.</p>",
  publishedAt: "2026-09-20T15:00:00Z",
  isPublic: true,
  isDraft: false,
  isContentHidden: false,
  artistId: SHOWCASE_ARTIST.id,
  artist: OPEN_WEB_ARTIST,
  featuredImage: { src: COVERS.ember.sizes["600"] },
  tracks: [
    {
      postId: 7101,
      trackId: 9101,
      isPlayable: true,
      title: "Ropes and Pulleys",
      audioDuration: 198,
    },
    {
      postId: 7101,
      trackId: 9102,
      isPlayable: true,
      title: "Ice on the Slipway",
      audioDuration: 244,
    },
    {
      postId: 7101,
      trackId: 9103,
      isPlayable: true,
      title: "Half a Chorus",
      audioDuration: 131,
    },
  ],
};

/** A small label whose roster includes Lumen Tide, for the label widget */
export const OPEN_WEB_LABEL: Label = {
  id: 7201,
  name: "Saltmarsh Records",
  urlSlug: "saltmarsh-records",
  profile: {
    ...SHOWCASE_ARTIST,
    id: 7201,
    name: "Saltmarsh Records",
    urlSlug: "saltmarsh-records",
    isLabelProfile: true,
    avatar: { ...COVERS.moss, url: COVERS.moss.url[0] },
    properties: {
      colors: {
        background: "#eef2ea",
        text: "#1d3a2f",
        button: "#2f6f5e",
        buttonText: "#ffffff",
      },
    },
  },
};

/** Two songs from each of three releases, as the label's playlist */
export const LABEL_TRACKS: Track[] = [TIDAL, MOSS, EMBER]
  .flatMap((release, i) =>
    release.tracks.slice(i * 2, i * 2 + 2).map((track) => ({
      ...track,
      trackGroup: { ...release, tracks: [] },
    }))
  )
  .map((track, i) => ({ ...track, order: i + 1 }));

/** The songs attached to the post, as the player fetches them */
const POST_TRACKS: Track[] = (OPEN_WEB_POST.tracks ?? []).map(
  (postTrack, i) => ({
    ...EMBER.tracks[i],
    id: postTrack.trackId,
    title: postTrack.title ?? "",
    trackGroup: EMBER,
    audio: {
      ...EMBER.tracks[i].audio!,
      duration: postTrack.audioDuration ?? 0,
    },
  })
);

const ALL_TRACKS: Track[] = [
  ...PLAYABLE_RELEASES.flatMap((r) =>
    r.tracks.map((t) => ({ ...t, trackGroup: r }))
  ),
  ...POST_TRACKS,
];

const releaseById = (id: string | readonly string[] | undefined) =>
  PLAYABLE_RELEASES.find((r) => String(r.id) === id || r.urlSlug === id);

/** Everything the widget pages fetch */
export const widgetHandlers = [
  ...audioHandlers,
  http.get("*/v1/trackGroups/:id", ({ params }) => {
    const release = releaseById(params.id);
    return release
      ? HttpResponse.json({ result: release })
      : HttpResponse.json({ error: "Not found" }, { status: 404 });
  }),
  http.get("*/v1/tracks/:id", ({ params }) => {
    const track = ALL_TRACKS.find((t) => String(t.id) === params.id);
    return track
      ? HttpResponse.json({ result: track })
      : HttpResponse.json({ error: "Not found" }, { status: 404 });
  }),
  http.get("*/v1/posts/:id", () =>
    HttpResponse.json({ result: OPEN_WEB_POST })
  ),
  http.get("*/v1/labels/:id/tracks", () =>
    HttpResponse.json({ results: LABEL_TRACKS })
  ),
  http.get("*/v1/labels/:id", () =>
    HttpResponse.json({ result: OPEN_WEB_LABEL })
  ),
  http.get("*/v1/artists/:artistSlug", () =>
    HttpResponse.json({ result: OPEN_WEB_ARTIST })
  ),
];
