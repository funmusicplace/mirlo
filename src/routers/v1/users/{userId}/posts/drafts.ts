import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
  };

  // FIXME: implement & document GET
  async function GET(req: Request, res: Response) {
    // const { userId } = req.params;
    // const drafts = await prisma.posts
    //   .findMany({
    //     where: {
    //       userId: Number(userId),
    //     },
    //   })
    //   .posts({
    //     where: { published: false },
    //   });
    // res.json(drafts);
  }

  return operations;
}
