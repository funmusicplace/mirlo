import prisma from "@mirlo/prisma";
import { Artist, Notification } from "@mirlo/prisma/client";

import { getClient } from "../activityPub/utils";
import logger from "../logger";
import { sendMailQueue, sendMailQueueEvents } from "../queues/send-mail-queue";

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

const sendLabelInviteNotification = async (
  notification: Notification & { artist: Partial<Artist> | null } & {
    user: { email: string } | null;
  } & { relatedUser: { email: string; name: string | null } | null }
) => {
  await prisma.notification.update({
    where: {
      id: notification.id,
    },
    data: {
      isRead: true,
    },
  });
  if (!notification.artist) {
    return;
  }
  if (!notification.relatedUser || !notification.relatedUserId) {
    return;
  }
  if (!notification.user) {
    return;
  }

  logger.info(
    `sendNotificationEmail: sending to queue notification for: invite ${notification.artist.name} to ${notification.relatedUser.email}`
  );

  const labelProfile = await prisma.artist.findFirst({
    where: {
      userId: notification.relatedUserId,
      isLabelProfile: true,
    },
  });
  const { applicationUrl } = await getClient();

  try {
    await sendMailQueue.add("send-mail", {
      template: "announce-label-invite",
      message: {
        to: notification.user.email,
      },
      locals: {
        artist: notification.artist,
        email: encodeURIComponent(notification.user.email),
        host: process.env.API_DOMAIN,
        label: labelProfile,
        client: applicationUrl,
      },
    });

    await prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        isRead: true,
      },
    });
    logger.info(`sendNotificationEmail: updated notification`);
  } catch (e) {
    logger.error(
      `sendNotificationEmail: failed to send to queue notification ${notification.id} to ${notification.user.email}`
    );
    logger.error(e);
  }
};

const sendNotificationEmail = async () => {
  logger.info(`sendNotificationEmail: sending notifications`);

  const labelNotifications = await prisma.notification.findMany({
    where: {
      isRead: false,
      createdAt: {
        lte: new Date(),
      },
      notificationType: {
        in: ["LABEL_ADDED_ARTIST"],
      },
      deliveryMethod: {
        in: ["EMAIL", "BOTH"],
      },
    },
    include: {
      trackGroup: {
        include: {
          artist: true,
        },
      },
      artist: {
        include: {
          user: {
            select: { email: true },
          },
        },
      },
      relatedUser: {
        select: {
          artists: true,
          id: true,
          name: true,
          email: true,
        },
      },
      user: true,
    },
  });

  logger.info(
    `sendNotificationEmail: found ${labelNotifications.length} label notifications`
  );

  try {
    for await (const notification of labelNotifications) {
      logger.info(
        `sendNotificationEmail: checking for label notification ${notification.id}`
      );
      if (
        notification &&
        notification.notificationType === "LABEL_ADDED_ARTIST" &&
        notification.artist &&
        notification.relatedUser
      ) {
        await sendLabelInviteNotification(notification);
      }
    }
  } catch (e) {
    logger.error(
      `sendNotificationEmail: failed to send out label notifications`
    );
    logger.error(e);
  } finally {
    logger.info(`sendNotificationEmail: closing queue`);
  }

  await sendMailQueue.close();
  await sendMailQueueEvents.close();
};

export default sendNotificationEmail;
