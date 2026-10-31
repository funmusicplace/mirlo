import prisma from "@mirlo/prisma";
import { Job } from "bullmq";

import { findFlaggedImageOwner } from "../utils/contentFlag";

import { logger } from "./queue-worker";

const { SIGHTENGINE_USER, SIGHTENGINE_SECRET } = process.env;

export const shouldModerateImage = (model: string) =>
  !!SIGHTENGINE_USER && !!SIGHTENGINE_SECRET && model !== "splashImage";

const moderateImage = async (job: Job) => {
  const { model, imageId, url } = job.data as {
    model: string;
    imageId: string;
    url: string;
  };

  if (!SIGHTENGINE_USER || !SIGHTENGINE_SECRET) {
    return;
  }

  logger.info("Checking SightEngine");
  const searchParams = new URLSearchParams();
  searchParams.append("url", url);
  searchParams.append("models", "nudity-2.1");
  searchParams.append("api_user", SIGHTENGINE_USER);
  searchParams.append("api_secret", SIGHTENGINE_SECRET);

  const response = await fetch(
    `https://api.sightengine.com/1.0/check.json?${searchParams.toString()}`,
    {
      method: "GET",
    }
  );
  if (response.status === 200) {
    const result = (await response.json()) as {
      nudity: { sexual_display: number };
      request: { id: string };
    };
    if (result.nudity.sexual_display > 0.9) {
      const owner = await findFlaggedImageOwner(model, imageId);
      await prisma.contentFlag.create({
        data: {
          source: "SIGHTENGINE",
          imageModel: model,
          imageId,
          externalId: result.request.id,
          score: result.nudity.sexual_display,
          ...owner,
        },
      });
      logger.info("Flagged content for review via SightEngine");
    }
  }
};

export default moderateImage;
