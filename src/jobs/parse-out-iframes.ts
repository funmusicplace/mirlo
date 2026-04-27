import prisma from "@mirlo/prisma";

import logger from "../logger";
import { getClient } from "../utils/getClient";

export const parseOutIframes = async (content: string) => {
  // Replace <iframe src="https://mirlo.space/widget/trackGroup/:id"> or <iframe src="https://mirlo.space/widget/track/:id">
  // with a div containing info about the trackGroup or track, fetching live data from the database

  // Find all iframes to process
  let htmlContent = content;
  try {
    const iframeRegex =
      /<iframe([^>]*)src=["']https:\/\/mirlo\.space\/widget\/(trackGroup|track)\/([^"']+)["']([^>]*)><\/iframe>/gi;

    // Collect all matches
    const matches: Array<{ match: string; type: string; id: string }> = [];
    let match;
    while ((match = iframeRegex.exec(htmlContent)) !== null) {
      matches.push({
        match: match[0],
        type: match[2],
        id: match[3],
      });
    }

    // Fetch all needed trackGroups and tracks
    const trackGroupIds = matches
      .filter((m) => m.type === "trackGroup")
      .map((m) => Number(m.id));
    const trackIds = matches
      .filter((m) => m.type === "track")
      .map((m) => Number(m.id));

    const [trackGroups, tracks] = await Promise.all([
      trackGroupIds.length
        ? prisma.trackGroup.findMany({
            where: { id: { in: trackGroupIds } },
            include: { artist: true, tracks: true },
          })
        : Promise.resolve([]),
      trackIds.length
        ? prisma.track.findMany({
            where: { id: { in: trackIds } },
            include: { trackGroup: { include: { artist: true } } },
          })
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const trackGroupMap = Object.fromEntries(
      trackGroups.map((tg) => [tg.id, tg])
    );
    const trackMap = Object.fromEntries(tracks.map((t) => [t.id, t]));

    // Replace iframes with divs containing info
    const { applicationUrl } = await getClient();
    htmlContent = htmlContent.replace(
      iframeRegex,
      (_match, _before, type, id, _after) => {
        if (type === "trackGroup" && trackGroupMap[id]) {
          const tg = trackGroupMap[id];
          const button = tg.artist.properties?.colors?.button || "#be3455";
          const background =
            tg.artist.properties?.colors?.background || "#f5f0f0";
          const buttonText = tg.artist.properties?.colors?.buttonText || "#111";
          const text = tg.artist.properties?.colors?.text || "#111";
          return `<div data-type="trackGroup" data-id="${id}" style="display:flex;flex-direction:row;gap:8px;background-color:${background};border-radius:8px;padding:16px;">
                    <div>
                      <a href="${applicationUrl}/${tg.artist.urlSlug}/release/${tg.urlSlug}" style="
                      display:inline-block;
                      text-decoration:none;
                      background:${button};
                      color:${text};
                      width: 32px;
                      height: 32px;
                      text-align: center;
                      padding-top: 3px;
                      vertical-align: middle;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border-radius: 24px;
                      font-weight: bold;">
                        &#9658;
                      </a>
                    </div>
                    <div>
                      <strong>${tg.title}</strong><br/>
                      <a href="${applicationUrl}/${tg.artist.urlSlug}" style="color:${button};text-decoration:none;">
                        ${tg.artist?.name || "Unknown"}
                      </a><br/>
                      <ol>
                        ${tg.tracks.map((track) => `<li>${track.title}</li>`).join("")}
                      </ol>
                    </div>
                  </div>`;
        } else if (type === "track" && trackMap[id]) {
          const t = trackMap[id];
          const button =
            t.trackGroup.artist.properties?.colors?.button || "#be3455";
          const background =
            t.trackGroup.artist.properties?.colors?.background || "#f5f0f0";
          const buttonText =
            t.trackGroup.artist.properties?.colors?.buttonText || "#111";
          const text = t.trackGroup.artist.properties?.colors?.text || "#111";
          return `<div data-type="track" data-id="${id}" style="display:flex;flex-direction:column;gap:8px;background-color:${background};border-radius:8px;padding:16px;">
                  <div>
                    <a href="${applicationUrl}/${t.trackGroup.artist.urlSlug}/release/${t.trackGroup.urlSlug}/track/${t.urlSlug}" style="display:inline-block;
                      text-decoration:none;
                      background:${button};
                      color:${text};
                      width: 32px;
                      height: 32px;
                      text-align: center;
                      padding-top: 3px;
                      vertical-align: middle;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border-radius: 24px;
                      font-weight: bold;">
                      &#9658;
                    </a>
                  </div>
                  <div>
                    <strong>${t.title}</strong><br/>
                    <a href="${applicationUrl}/${t.trackGroup.artist.urlSlug}" style="color:${text}; text-decoration:none;">
                      ${t.trackGroup.artist?.name || "Unknown"}
                    </a>
                  </div>
                </div>`;
        }
        // If not found, fallback to a placeholder
        return `<div data-type="${type}" data-id="${id}"></div>`;
      }
    );
  } catch (error) {
    logger.error(`parseOutIframes: failed to parse content`);
    logger.error(error);
    // If there's an error, return the original content
  }

  return htmlContent;
};
