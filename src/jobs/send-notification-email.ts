import prisma from "@mirlo/prisma";
import { Artist, Notification, Post } from "@mirlo/prisma/client";
import logger from "../logger";
import { sendMailQueue, sendMailQueueEvents } from "../queues/send-mail-queue";
import { processSinglePost } from "../utils/post";

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
    htmlContent = htmlContent.replace(
      iframeRegex,
      (_match, _before, type, id, _after) => {
        if (type === "trackGroup" && trackGroupMap[id]) {
          const tg = trackGroupMap[id];
          const primary = tg.artist.properties?.colors?.primary || "#be3455";
          const background =
            tg.artist.properties?.colors?.background || "#f5f0f0";
          const secondary = tg.artist.properties?.colors?.secondary || "#111";
          const foreground = tg.artist.properties?.colors?.foreground || "#111";
          return `<div data-type="trackGroup" data-id="${id}" style="display:flex;flex-direction:row;gap:8px;background-color:${background};border-radius:8px;padding:16px;">
                    <div>
                      <a href="${process.env.REACT_APP_CLIENT_DOMAIN}/${tg.artist.urlSlug}/release/${tg.urlSlug}" style="
                      display:inline-block;
                      text-decoration:none;
                      background:${primary};
                      color:${foreground};
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
                      <a href="${process.env.REACT_APP_CLIENT_DOMAIN}/${tg.artist.urlSlug}" style="color:${primary};text-decoration:none;">
                        ${tg.artist?.name || "Unknown"}
                      </a><br/>
                      <ol>
                        ${tg.tracks.map((track) => `<li>${track.title}</li>`).join("")}
                      </ol>
                    </div>
                  </div>`;
        } else if (type === "track" && trackMap[id]) {
          const t = trackMap[id];
          const primary =
            t.trackGroup.artist.properties?.colors?.primary || "#be3455";
          const background =
            t.trackGroup.artist.properties?.colors?.background || "#f5f0f0";
          const secondary =
            t.trackGroup.artist.properties?.colors?.secondary || "#111";
          const foreground =
            t.trackGroup.artist.properties?.colors?.foreground || "#111";
          return `<div data-type="track" data-id="${id}" style="display:flex;flex-direction:column;gap:8px;background-color:${background};border-radius:8px;padding:16px;">
                  <div>
                    <a href="${process.env.REACT_APP_CLIENT_DOMAIN}/${t.trackGroup.artist.urlSlug}/release/${t.trackGroup.urlSlug}/track/${t.urlSlug}" style="display:inline-block;
                      text-decoration:none;
                      background:${primary};
                      color:${foreground};
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
                    <a href="${process.env.REACT_APP_CLIENT_DOMAIN}/${t.trackGroup.artist.urlSlug}" style="color:${foreground}; text-decoration:none;">
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

const sendPostNotifications = async (
  notification: Notification & { post: Post | null } & {
    user: { email: string };
  }
) => {
  if (!notification.post) {
    return;
  }
  const post = processSinglePost(notification.post);

  if (!post.shouldSendEmail) {
    logger.info(
      `sendNotificationEmail: post asked not to be emailed: ${post.title} to ${notification.user.email}`
    );
    await prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        isRead: true,
      },
    });
    logger.info(`sendNotificationEmail: updated notification`);
  } else if (!!post.content) {
    // If the post doesn't have content we shouldn't send it.
    // It's likely an error
    logger.info(
      `sendNotificationEmail: sending to queue notification for: ${post.title} to ${notification.user.email}`
    );
    const htmlContent = await parseOutIframes(post.content);

    try {
      await sendMailQueue.add("send-mail", {
        template: "announce-post-published",
        message: {
          to: notification.user.email,
        },
        locals: {
          artist: post.artist,
          post: {
            ...post,
            htmlContent,
          },
          email: encodeURIComponent(notification.user.email),
          host: process.env.API_DOMAIN,
          client: process.env.REACT_APP_CLIENT_DOMAIN,
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
  }
};

const sendLabelInviteNotification = async (
  notification: Notification & { artist: Artist | null } & {
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
        client: process.env.REACT_APP_CLIENT_DOMAIN,
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

  const notifications = await prisma.notification.findMany({
    where: {
      isRead: false,
      createdAt: {
        lte: new Date(),
      },
      notificationType: {
        in: ["NEW_ARTIST_POST", "SYSTEM_MESSAGE", "LABEL_ADDED_ARTIST"],
      },
    },
    include: {
      post: {
        include: {
          artist: true,
          featuredImage: true,
        },
      },
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
    `sendNotificationEmail: found ${notifications.length} notifications to send out`
  );

  try {
    for await (const notification of notifications) {
      logger.info(
        `sendNotificationEmail: checking for notification ${notification.id}`
      );
      if (
        notification.post &&
        notification.notificationType === "NEW_ARTIST_POST" &&
        notification.post.artist
      ) {
        sendPostNotifications(notification);
      }
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
    logger.error(`sendNotificationEmail: failed to send out all notifications`);
    logger.error(e);
  } finally {
    logger.info(`sendNotificationEmail: closing queue`);

    await sendMailQueue.close();
    await sendMailQueueEvents.close();
  }
};

export default sendNotificationEmail;
