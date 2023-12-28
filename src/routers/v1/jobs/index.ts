import { Request, Response } from "express";
import { Queue } from "bullmq";
import { REDIS_CONFIG } from "../../../config/redis";

const queueOptions = {
  prefix: "mirlo",
  connection: REDIS_CONFIG,
};

export const audioQueue = new Queue("convert-audio", queueOptions);

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response) {
    const { ids } = req.query as { ids: string[] };
    let states: {
      jobId: string;
      jobStatus: string;
      progress?: number | object;
    }[] = [];
    try {
      if (Array.isArray(ids)) {
        for (const id of ids) {
          let state = await audioQueue.getJobState(id);
          let job = await audioQueue.getJob(id);
          states.push({ jobId: id, jobStatus: state, progress: job?.progress });
        }
      } else {
        states.push({
          jobId: ids,
          jobStatus: await audioQueue.getJobState(ids),
          progress: (await audioQueue.getJob(ids))?.progress,
        });
      }
    } catch (e) {
      console.error("/jobs", e);
    }

    res.json({ results: states });
  }

  return operations;
}
