import { Request, Response } from "express";

import { getClient } from "../../../../../activityPub/utils";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response) {
    try {
      const client = await getClient();

      res.redirect(`${client?.applicationUrl}/manage?stripeConnect=done`);
    } catch (e) {
      console.error(e);
      res.json({
        error: `Stripe Connect encountered a problem`,
      });
    }
  }

  return operations;
}
