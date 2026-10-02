import prisma from "@mirlo/prisma";
import { Profile, User } from "@mirlo/prisma/client";

import { sendMailQueue } from "../queues/send-mail-queue";
import { serializeProfile } from "../serializers/artist";
import { serializeProfileManager } from "../serializers/profileManager";

import { getClient } from "./getClient";

export const findProfileManagers = async (
  profileId: number,
  { showEmail }: { showEmail: boolean }
) => {
  const managers = await prisma.profileManager.findMany({
    // Nested relations aren't soft-delete filtered automatically.
    where: { profileId, user: { deletedAt: null } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      invitedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return managers.map((manager) =>
    serializeProfileManager(manager, { showEmail })
  );
};

export const sendProfileManagerInvite = async (
  profile: Profile,
  invitedUser: Pick<User, "id" | "name" | "email">,
  invitedBy: Pick<User, "id" | "name">
) => {
  const client = await getClient();

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: invitedUser.id,
      notificationType: "PROFILE_MANAGER_INVITE",
      profileId: profile.id,
    },
  });
  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: invitedUser.id,
        notificationType: "PROFILE_MANAGER_INVITE",
        deliveryMethod: "IN_APP",
        profileId: profile.id,
        relatedUserId: invitedBy.id,
      },
    });
  }

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
