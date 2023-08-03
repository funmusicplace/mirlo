import { Request, Response } from "express";
import { userHasPermission } from "../../../auth/passport";
import prisma from "../../../../prisma/prisma";

export default function () {
  const operations = {
    GET: [userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response) {
    const users = await prisma.user.findMany();
    res.json({ results: users });
  }
  return operations;
}
