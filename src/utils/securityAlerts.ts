import prisma from "@mirlo/prisma";
import { Request } from "express";

import logger from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";

type SecurityAlerts = {
  settingsChanged: { fields: string };
  adminGranted: { target: string };
  adminRevoked: { target: string };
  impersonated: { target: string };
  securityKeyAdded: { name: string };
  securityKeyRemoved: { name: string };
  authenticatorEnabled: Record<string, never>;
  authenticatorDisabled: Record<string, never>;
  recoveryCodesRegenerated: Record<string, never>;
  recoveryCodeUsed: { remaining: number };
};

export const sendSecurityAlert = async <E extends keyof SecurityAlerts>(
  req: Request,
  event: E,
  details: SecurityAlerts[E]
) => {
  const actor = req.user?.email ?? "unknown";
  const ip = req.ip ?? "unknown";
  const time = new Date().toISOString();

  logger.warn(
    `security-alert: ${event} ${JSON.stringify({ actor, ip, ...details })}`
  );

  try {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true, disabledAt: null },
      select: { email: true },
    });
    await sendMailQueue.addBulk(
      admins.map((admin) => ({
        name: "send-mail",
        data: {
          template: "security-alert",
          message: { to: admin.email },
          locals: { event, actor, ip, time, ...details },
        },
      }))
    );
  } catch (e) {
    logger.error(`security-alert: failed to queue emails for ${event}: ${e}`);
  }
};
