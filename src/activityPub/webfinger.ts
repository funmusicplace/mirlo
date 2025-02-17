import prisma from "@mirlo/prisma";
import { Request, Response } from "express";
import { getClient, artistsEndpoint } from "./utils";
const { REACT_APP_CLIENT_DOMAIN } = process.env;

const mirloDomain = REACT_APP_CLIENT_DOMAIN?.split("//")[1];

const webfinger = async (req: Request, res: Response) => {
  const client = await getClient();

  const { resource } = req.query as { resource?: string };
  if (!resource || !resource?.includes("acct:")) {
    return res
      .status(400)
      .send(
        'Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.'
      );
  }
  const name = resource
    .replace("acct:", "")
    .replace("@mirlo.space", "")
    .replace("@", "");

  const artist = await prisma.artist.findFirst({
    where: {
      urlSlug: name,
      activityPub: true,
    },
  });

  if (!artist) {
    return res.status(404).send("Resource not found");
  }

  const root = artistsEndpoint.replace("api.", "");

  res
    .json({
      subject: `acct:${artist.urlSlug}@${mirloDomain}`,
      aliases: [`${root}${artist.urlSlug}`],
      links: [
        {
          rel: "self",
          type: "application/activity+json",
          href: `${root}${artist.urlSlug}`,
        },
        {
          rel: "http://webfinger.net/rel/profile-page",
          type: "text/html",
          href: `${client.applicationUrl}/${artist.urlSlug}`,
        },
      ],
    })
    .send();
};

export default webfinger;
