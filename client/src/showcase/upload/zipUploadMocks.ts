/**
 * Stateful MSW handlers for the zip upload showcase: the release starts empty,
 * and saving metadata, uploading the cover and creating tracks all write back
 * into the release so the page fills in exactly as it would against the API.
 */
import { http, HttpResponse } from "msw";

import { COVERS, RELEASES, SHOWCASE_ARTIST } from "../shared/fixtures";

/** How long a freshly uploaded track shows as "still processing" */
const PROCESSING_MS = 7000;

export const SAMPLE_ZIP_URL = "/showcase/Lumen Tide - Tidal Hours.zip";

const LICENSES: (License & { name: string })[] = [
  { id: 1, short: "copyright", name: "All rights reserved" },
  {
    id: 2,
    short: "CC BY-SA 4.0",
    name: "Creative Commons Attribution-ShareAlike 4.0",
    link: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
];

/** A brand new, untitled draft: what an artist sees right after "New release" */
export const EMPTY_RELEASE: TrackGroup = {
  ...RELEASES.tidal,
  title: "",
  urlSlug: "untitled-release",
  about: "",
  credits: "",
  cover: undefined,
  publishedAt: undefined,
  tracks: [],
  downloadableContent: [],
};

type UploadedTrack = { track: Track; createdAt: number };

const state = {
  release: EMPTY_RELEASE,
  uploaded: [] as UploadedTrack[],
  nextId: 7101,
};

/** Story loader: start every story from the empty draft */
export const resetZipUploadState = async () => {
  state.release = { ...EMPTY_RELEASE };
  state.uploaded = [];
  state.nextId = 7101;
  return {};
};

const withUploadState = ({ track, createdAt }: UploadedTrack): Track => ({
  ...track,
  audio: {
    ...track.audio!,
    uploadState: Date.now() - createdAt > PROCESSING_MS ? "SUCCESS" : "STARTED",
  },
});

const currentRelease = (): TrackGroup => ({
  ...state.release,
  tracks: state.uploaded.map(withUploadState).sort((a, b) => a.order - b.order),
});

type TrackPacket = {
  title: string;
  filename: string;
  order: number;
  isPreview: boolean;
  metadata?: { format?: { duration?: number } };
  trackArtists: Track["trackArtists"];
};

export const zipUploadHandlers = [
  http.get("*/v1/manage/trackGroups/:trackGroupId", () =>
    HttpResponse.json({ result: currentRelease() })
  ),
  http.put("*/v1/manage/trackGroups/:trackGroupId", async ({ request }) => {
    const body = (await request.json()) as Partial<TrackGroup>;
    state.release = {
      ...state.release,
      title: body.title || state.release.title,
      urlSlug:
        state.release.title || !body.title
          ? state.release.urlSlug
          : body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      about: body.about ?? state.release.about,
      releaseDate: body.releaseDate ?? state.release.releaseDate,
    };
    return HttpResponse.json({ result: currentRelease() });
  }),
  http.put("*/v1/manage/trackGroups/:trackGroupId/cover", () => {
    state.release = { ...state.release, cover: COVERS.tidal };
    // No jobId: the upload panel marks the cover done straight away
    return HttpResponse.json({ result: {} });
  }),
  http.post("*/v1/manage/tracks", async ({ request }) => {
    const packet = (await request.json()) as TrackPacket;
    const track: Track = {
      ...RELEASES.tidal.tracks[0],
      id: state.nextId++,
      trackGroupId: state.release.id,
      title: packet.title,
      order: packet.order,
      isPreview: packet.isPreview,
      status: packet.isPreview ? "preview" : "must-own",
      trackArtists: (packet.trackArtists ?? []).map((a) => ({
        ...a,
        artistId:
          a.artistName === SHOWCASE_ARTIST.name
            ? SHOWCASE_ARTIST.id
            : a.artistId,
      })),
      audio: {
        url: "",
        createdAt: new Date().toISOString(),
        duration: packet.metadata?.format?.duration ?? 240,
        uploadState: "STARTED",
        originalFilename: packet.filename.split("/").pop() ?? packet.filename,
      },
    };
    state.uploaded.push({ track, createdAt: Date.now() });
    return HttpResponse.json({
      result: track,
      uploadUrl: `https://uploads.showcase.mirlo.space/incoming/${track.id}`,
    });
  }),
  http.put("https://uploads.showcase.mirlo.space/*", async () => {
    // Long enough that the progress bars visibly move in a recording
    await new Promise((resolve) => setTimeout(resolve, 900));
    return new HttpResponse(null, { status: 200 });
  }),
  http.put("*/v1/manage/tracks/:trackId/process", () =>
    HttpResponse.json({ result: {} })
  ),
  http.get("*/v1/manage/tracks/:trackId", ({ params }) => {
    const found = state.uploaded.find(
      (u) => String(u.track.id) === params.trackId
    );
    return HttpResponse.json({
      result: found ? withUploadState(found) : RELEASES.tidal.tracks[0],
    });
  }),
  http.post("*/v1/manage/downloadableContent", async ({ request }) => {
    const body = (await request.json()) as { filename: string };
    const content: DownloadableContent = {
      id: 9001,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalFilename: body.filename,
      trackGroups: [],
      merch: [],
    };
    state.release = {
      ...state.release,
      downloadableContent: [
        {
          trackGroupId: state.release.id,
          trackGroup: undefined as unknown as TrackGroup,
          downloadableContentId: "9001",
          downloadableContent: content,
        },
      ],
    };
    return HttpResponse.json({
      result: { id: "booklet", originalFilename: body.filename },
      uploadUrl: "https://uploads.showcase.mirlo.space/downloadable/booklet",
    });
  }),
];

/** Everything else the release page reads, all quiet and empty */
export const releasePageHandlers = [
  http.get("*/v1/manage/trackGroups/:trackGroupId/recommendedTrackGroups", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/trackGroups/:trackGroupId/supporters/", () =>
    HttpResponse.json({
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
      totalPledges: 0,
    })
  ),
  http.get("*/v1/licenses", () => HttpResponse.json({ results: LICENSES })),
  http.get("*/v1/tags", () => HttpResponse.json({ results: [] })),
];
