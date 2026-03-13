import { Request, Response, NextFunction } from "express";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { slug } = req.params;

    try {
      const locationTag = await prisma.locationTag.findUnique({
        where: { slug },
      });

      if (!locationTag) {
        // if no location tag is found with the given slug,
        // see if the slug is a country that matches the country field of a location tag
        if (slug.includes("-")) {
          return res
            .status(404)
            .json({ error: `LocationTag with slug ${slug} not found` });
        }
        const locationTagByCountry = await prisma.locationTag.findFirst({
          where: {
            country: { contains: slug, mode: "insensitive" },
            region: null,
            city: null,
          },
        });

        if (locationTagByCountry) {
          return res.json({ result: locationTagByCountry });
        }
      }

      if (!locationTag) {
        return res
          .status(404)
          .json({ error: `LocationTag with slug ${slug} not found` });
      }

      res.json({ result: locationTag });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Get a location tag by slug",
    tags: ["Location Tags"],
    parameters: [
      {
        in: "path",
        name: "slug",
        required: true,
        type: "string",
        description: "The slug of the location tag to retrieve",
      },
    ],
    responses: {
      200: {
        description: "A single location tag",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
            },
          },
        },
      },
      404: {
        description: "LocationTag not found",
      },
    },
  };

  return operations;
}
