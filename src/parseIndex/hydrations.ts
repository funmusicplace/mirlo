import * as cheerio from "cheerio";

import { processSingleArtist } from "../utils/serialize/artist";
import { processSingleTrack } from "../utils/serialize/track";
import { processSingleTrackGroup } from "../utils/serialize/trackGroup";

export type HydrationData = {
  scriptId: string;
  objectId: string | number;
  data: any;
  profileId?: string | number;
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
  profileId?: string | number
) => {
  try {
    const injectedAt = new Date().toISOString();
    $("head").append(
      `<script id="${scriptId}" type="application/json" data-object-id="${objectId}" data-injected-at="${injectedAt}"${profileId ? ` data-artist-id="${profileId}"` : ""}>${JSON.stringify(data)}</script>`
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
  profileId?: string | number
) => {
  hydrations.push({
    scriptId,
    objectId,
    data,
    profileId,
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
 * Helper to register post hydration
 */
export const registerPostHydration = (
  hydrations: HydrationData[],
  post: any
) => {
  registerHydration(hydrations, "__MIRLO_POST__", post.urlSlug, {
    post: post,
  });
};

/**
 * Helper to register artist hydration
 */
export const registerArtistHydration = (
  hydrations: HydrationData[],
  profile: any
) => {
  registerHydration(hydrations, "__MIRLO_ARTIST__", profile.urlSlug, {
    artist: processSingleArtist(profile),
  });
};
