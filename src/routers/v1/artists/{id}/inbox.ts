import { Request, Response } from "express";
import inboxPOST from "../../../../activityPub/inboxPOST";
import { rootArtist } from "../../../../activityPub/utils";
import { findArtistIdForURLSlug } from "../../../../utils/artist";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET: [GET],
    POST: [inboxPOST],
  };

  async function GET(req: Request, res: Response) {
    const { id } = req.params;

    const parsedId = await findArtistIdForURLSlug(id);
    const artist = await prisma.artist.findFirst({
      where: { id: parsedId },
    });

    if (!artist) {
      return res.status(404).json({ error: "Artist not found" });
    }

    // Return an OrderedCollection representing the inbox
    const inbox = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${rootArtist}${artist.urlSlug}/inbox`,
      type: "OrderedCollection",
      totalItems: 0,
      first: {
        type: "OrderedCollectionPage",
        id: `${rootArtist}${artist.urlSlug}/inbox?page=1`,
        partOf: `${rootArtist}${artist.urlSlug}/inbox`,
        orderedItems: [],
      },
    };

    res.set("content-type", "application/activity+json");
    res.json(inbox);
  }

  GET.apiDoc = {
    summary: "Returns the inbox collection (ActivityPub)",
    responses: {
      200: {
        description: "The inbox OrderedCollection",
        schema: {
          type: "object",
          properties: {
            type: { type: "string" },
            id: { type: "string" },
            totalItems: { type: "number" },
          },
        },
      },
      404: {
        description: "Artist not found",
      },
    },
  };

  return operations;
}
