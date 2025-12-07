import { Request, Response } from "express";
import { JobProgress, JobState, Queue } from "bullmq";
import { REDIS_CONFIG } from "../../../config/redis";

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const audioQueue = new Queue("upload-audio", queueOptions);
export const optimizeImage = new Queue("optimize-image", queueOptions);
export const generateAlbumQueue = new Queue("generate-album", queueOptions);

const getJobStatus = async (queue: string, jobId: string) => {
  let job;
  if (queue === "generateAlbum") {
    job = await generateAlbumQueue.getJob(jobId);
  } else if (queue === "optimizeImage") {
    job = await optimizeImage.getJob(jobId);
  } else {
    job = await audioQueue.getJob(jobId);
  }
  return {
    jobId,
    jobStatus: (await job?.getState()) ?? "unknown",
    progress: job?.progress,
  };
};

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response) {
    const { ids, queue = "convertAudio" } = req.query as {
      ids: string[];
      queue: string;
    };
    let states: {
      jobId: string;
      jobStatus: JobState | "unknown";
      progress?: JobProgress;
    }[] = [];
    try {
      if (Array.isArray(ids)) {
        for (const id of ids) {
          states.push(await getJobStatus(queue, id));
        }
      } else {
        states.push(await getJobStatus(queue, ids));
      }
    } catch (e) {
      console.error("/jobs", e);
    }

    res.json({ results: states });
  }

  return operations;
}
