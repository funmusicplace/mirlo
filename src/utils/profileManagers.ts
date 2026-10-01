import prisma from "@mirlo/prisma";
import { Profile, User } from "@mirlo/prisma/client";

import { sendMailQueue } from "../queues/send-mail-queue";
import { serializeProfile } from "../serializers/artist";

import { getClient } from "./getClient";

export const findProfileManagers = (profileId: number) =>
  prisma.profileManager.findMany({
    where: { profileId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      invitedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

export const sendProfileManagerInvite = async (
  profile: Profile,
  invitedUser: Pick<User, "id" | "name" | "email">,
  invitedBy: Pick<User, "id" | "name">
) => {
  const client = await getClient();

  await prisma.notification.create({
    data: {
      userId: invitedUser.id,
      notificationType: "PROFILE_MANAGER_INVITE",
      deliveryMethod: "IN_APP",
      profileId: profile.id,
      relatedUserId: invitedBy.id,
    },
  });

  try {
    await sendMailQueue.add("send-mail", {
      template: "announce-manager-invite",
      message: {
        to: invitedUser.email,
      },
      locals: {
        artist: serializeProfile(profile),
        user: { name: invitedUser.name },
        invitedBy,
        client: client.applicationUrl,
      },
    });
  } catch (error) {
    console.error(
      `Failed to queue manager invite email for artist ${profile.id}`,
      error
    );
  }
};
