import * as cheerio from "cheerio";

import { processSingleArtist } from "../serializers/artist";
import { serializePost } from "../serializers/post";
import { processSingleTrack } from "../serializers/track";
import { processSingleTrackGroup } from "../serializers/trackGroup";

export type HydrationData = {
  scriptId: string;
  objectId: string | number;
  data: any;
  artistId?: string | number;
};
/**
 * Appends a hydration script to the head with data-object-id and data-injected-at attributes
 * to avoid parsing the JSON blob to determine object matching or injection timing
 */
export const appendHydrationScript = (
  $: cheerio.CheerioAPI,
  scriptId: string,
  objectId: string | number,
  data: any,
  artistId?: string | number
) => {
  try {
    const injectedAt = new Date().toISOString();
    $("head").append(
      `<script id="${scriptId}" type="application/json" data-object-id="${objectId}" data-injected-at="${injectedAt}"${artistId ? ` data-artist-id="${artistId}"` : ""}>${JSON.stringify(data)}</script>`
    );
  } catch (err) {
    console.error(
      `Error appending hydration script ${scriptId}:${objectId}`,
      err
    );
  }
};

/**
 * Register a hydration to be applied after route handling
 */
export const registerHydration = (
  hydrations: HydrationData[],
  scriptId: string,
  objectId: string | number,
  data: any,
  artistId?: string | number
) => {
  hydrations.push({
    scriptId,
    objectId,
    data,
    artistId,
  });
};

/**
 * Helper to register track hydration
 */
export const registerTrackHydration = (
  hydrations: HydrationData[],
  track: any
) => {
  registerHydration(hydrations, "__MIRLO_TRACK__", track.id, {
    track: processSingleTrack(track),
  });
};

/**
 * Helper to register trackgroup hydration
 */
export const registerTrackGroupHydration = (
  hydrations: HydrationData[],
  trackGroup: any
) => {
  registerHydration(hydrations, "__MIRLO_TRACKGROUP__", trackGroup.urlSlug, {
    trackGroup: processSingleTrackGroup(trackGroup, {}),
  });
};

/**
 * Helper to register post hydration. Callers should pass the same
 * purchase / visibility args as `/v1/posts/{id}` (via postAccess helpers).
 */
export const registerPostHydration = (
  hydrations: HydrationData[],
  post: Parameters<typeof serializePost>[0],
  userTrackGroupPurchases?: Parameters<typeof serializePost>[1],
  userTrackPurchases?: Parameters<typeof serializePost>[2],
  canSeeContent?: Parameters<typeof serializePost>[3]
) => {
  registerHydration(hydrations, "__MIRLO_POST__", post.urlSlug ?? post.id, {
    post: serializePost(
      post,
      userTrackGroupPurchases,
      userTrackPurchases,
      canSeeContent
    ),
  });
};

/**
 * Helper to register artist hydration
 */
export const registerArtistHydration = (
  hydrations: HydrationData[],
  artist: any
) => {
  registerHydration(hydrations, "__MIRLO_ARTIST__", artist.urlSlug, {
    artist: processSingleArtist(artist),
  });
};
