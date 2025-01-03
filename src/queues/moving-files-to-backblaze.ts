import { Job, Queue, QueueEvents } from "bullmq";
import { REDIS_CONFIG } from "../config/redis";
import logger from "../logger";
import { getObjectList, minioClient, uploadWrapper } from "../utils/minio";
import { sleep } from "../jobs/optimize-image";

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const moveFilesToBackBlazeQueue = new Queue(
  "move-file-to-backblaze",
  queueOptions
);

export const moveFilesToBackBlazeQueueEvents = new QueueEvents(
  "move-file-to-backblaze",
  queueOptions
);

moveFilesToBackBlazeQueueEvents.on(
  "completed",
  async (result: { jobId: string; returnvalue?: any }) => {
    logger.info(
      `Job with id ${JSON.stringify(
        result.jobId
      )} has been completed, ${JSON.stringify(result.returnvalue)}`
    );
  }
);

moveFilesToBackBlazeQueueEvents.on(
  "stalled",
  async (result: { jobId: string }) => {
    logger.info(`jobId ${result.jobId} stalled: that's a bummer`);
  }
);

moveFilesToBackBlazeQueueEvents.on("error", async (error) => {
  logger.error(`jobId ${JSON.stringify(error)} had an error`);
});

export const startMovingFiles = async (bucketName: string) => {
  const files = await getObjectList(bucketName, "");
  files.map(async (file, i) => {
    try {
      console.log("adding to queue", file.name);
      moveFilesToBackBlazeQueue.add(
        "move-file-to-backblaze",
        {
          bucketName,
          fileName: file.name,
        },
        {
          delay: i * 1500,
        }
      );
    } catch (e) {
      console.error(e);
      logger.error("Error adding to queue");
    }
  });
};

export const moveFilesToBackblazeJob = async (job: Job) => {
  const bucketName = job.data.bucketName;
  const fileName = job.data.fileName;

  logger.info(`moving file: bucket: ${bucketName}, ${fileName}`);
  try {
    const stream = await minioClient.getObject(bucketName, fileName);
    await uploadWrapper(bucketName, fileName, stream);
  } catch (e) {
    console.error(e);
    logger.error("Error moving file");
  }
  logger.info(`done transfering ${bucketName}/${fileName}`);
};
