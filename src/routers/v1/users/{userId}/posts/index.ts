import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";

const prisma = new PrismaClient();

export default function () {
  const operations = {
    POST,
  };

  // FIXME: only allow creation of posts for
  // artists the user owns
  async function POST(req: Request, res: Response) {
    const { title, content, artistId } = req.body;
    const result = await prisma.post.create({
      data: {
        title,
        content,
        author: { connect: { id: artistId } },
      },
    });
    res.json(result);
  }
  // FIXME: document POST

  return operations;
}
