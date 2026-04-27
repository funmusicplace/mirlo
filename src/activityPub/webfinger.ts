import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { getClient, rootArtist } from "./utils";

const parseAcctResource = (resource?: string) => {
  if (!resource) {
    return null;
  }

  const match = resource.match(/^acct:([^@]+)@([^@]+)$/i);
  if (!match) {
    return null;
  }

  return {
    username: match[1],
    domain: match[2].toLowerCase(),
  };
};

const webfinger = async (req: Request, res: Response) => {
  const client = await getClient();

  const root = new URL(
    process.env.API_DOMAIN || `http://${req.hostname}`
  ).hostname.toLowerCase();

  const { resource } = req.query as { resource?: string };
  const parsedResource = parseAcctResource(resource);

  if (!parsedResource) {
    return res
      .status(400)
      .send(
        'Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.'
      );
  }

  if (parsedResource.domain !== root) {
    return res.status(404).send("Resource not found");
  }

  const artist = await prisma.artist.findFirst({
    where: {
      urlSlug: parsedResource.username,
      activityPub: true,
    },
  });

  if (!artist) {
    return res.status(404).send("Resource not found");
  }

  res.json({
    subject: `acct:${artist.urlSlug}@${root}`,
    aliases: [`${client.applicationUrl}/${artist.urlSlug}`],
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: `${rootArtist}${artist.urlSlug}`,
      },
      {
        rel: "http://webfinger.net/rel/profile-page",
        type: "text/html",
        href: `${client.applicationUrl}/${artist.urlSlug}`,
      },
    ],
  });
};

export default webfinger;
