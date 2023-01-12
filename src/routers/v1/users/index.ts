import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
  };

  // FIXME: document GET
  async function GET(req: Request, res: Response) {
    const users = await prisma.user.findMany();
    res.json(users);
  }
  return operations;
}

// router.get("/feed", async (req, res) => {
//   const { searchString, skip, take, orderBy } = req.query;

//   const or: Prisma.PostWhereInput = searchString
//     ? {
//         OR: [
//           { title: { contains: searchString as string } },
//           { content: { contains: searchString as string } },
//         ],
//       }
//     : {};

//   const posts = await prisma.post.findMany({
//     where: {
//       published: true,
//       ...or,
//     },
//     include: { author: true },
//     take: Number(take) || undefined,
//     skip: Number(skip) || undefined,
//     orderBy: {
//       updatedAt: orderBy as Prisma.SortOrder,
//     },
//   });

//   res.json(posts);
// });
