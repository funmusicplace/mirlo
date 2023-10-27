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
    let states: { jobId: string; jobStatus: string }[] = [];
    try {
      if (Array.isArray(ids)) {
        for (const id of ids) {
          let state = await audioQueue.getJobState(id);
          states.push({ jobId: id, jobStatus: state });
        }
      } else {
        states.push({
          jobId: ids,
          jobStatus: await audioQueue.getJobState(ids),
        });
      }
    } catch (e) {
      console.error("/jobs", e);
    }

    res.json({ results: states });
  }

  return operations;
}
