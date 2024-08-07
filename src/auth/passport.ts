import { User } from "@mirlo/prisma/client";

import { NextFunction, Request, Response } from "express";
import { TokenExpiredError } from "jsonwebtoken";
import passport from "passport";
import passportJWT from "passport-jwt";
import prisma from "@mirlo/prisma";
import { findArtistIdForURLSlug } from "../utils/artist";
import logger from "../logger";
import { AppError } from "../utils/error";
import { doesTrackGroupBelongToUser } from "../utils/ownership";

const JWTStrategy = passportJWT.Strategy;

const secret = process.env.JWT_SECRET;

const cookieExtractor = (req: Request) => {
  let jwt = null;

  if (req && req.cookies) {
    jwt = req.cookies["jwt"];
  }

  return jwt;
};

passport.use(
  "jwt",
  new JWTStrategy(
    {
      jwtFromRequest: cookieExtractor,
      secretOrKey: secret,
    },
    async (jwtPayload, done) => {
      const { expiration, email } = jwtPayload;

      if (Date.now() > expiration) {
        done("Unauthorized", false);
      }
      const foundUser = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (!foundUser) {
        done(null, false);
      }
      done(null, { ...jwtPayload, isAdmin: foundUser?.isAdmin });
    }
  )
);

export const userLoggedInWithoutRedirect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    "jwt",
    { session: false },
    (err?: unknown, user?: Express.User, info?: any) => {
      if (err instanceof TokenExpiredError) {
        return res.status(401).json({ error: info.message });
      } else if (err) {
        return next(err);
      }
      if (!user) {
        return next();
      }
      req.user = user;
      return next();
    }
  )(req, res, next);
};

export const userAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    passport.authenticate("jwt", { session: false })(req, res, next);
  } catch (e) {
    logger.info(`failed user authentication check ${e}`);
    res.status(401).json({ error: "Unauthorized" });
  }
};

export const userHasPermission = (role: "admin" | "owner") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params as unknown as { userId: string };
    const loggedInUser = req.user as User | undefined;
    if (!loggedInUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    } else {
      // FIXME: this just checks that the user id in the url belongs to the user
      //
      if (
        role === "owner" &&
        Number(userId) !== loggedInUser.id &&
        !loggedInUser.isAdmin
      ) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      } else if (role === "admin" && !loggedInUser.isAdmin) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }
    return next();
  };
};

export const artistBelongsToLoggedInUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { artistId } = req.params as unknown as {
    artistId: string;
  };
  const castArtistId = await findArtistIdForURLSlug(artistId);
  const loggedInUser = req.user as User | undefined;

  if (!loggedInUser) {
    res.status(401).json({ error: "Unauthorized" });
  } else {
    if (loggedInUser.isAdmin) {
      return next();
    }

    const artist = await prisma.artist.findFirst({
      where: {
        userId: loggedInUser.id,
        id: Number(castArtistId),
      },
    });

    if (!artist) {
      res.status(404).json({
        error: "Artist not found",
      });
      return;
    }
  }
  return next();
};

export const trackGroupBelongsToLoggedInUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { trackGroupId } = req.params as unknown as {
    trackGroupId: string;
  };

  const loggedInUser = req.user as User | undefined;

  try {
    if (!loggedInUser) {
      throw new AppError({
        description: "Not logged in user",
        httpCode: 401,
      });
    } else {
      await doesTrackGroupBelongToUser(Number(trackGroupId), loggedInUser);
    }
  } catch (e) {
    return next(e);
  }
  return next();
};

export const trackBelongsToLoggedInUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { trackId } = req.params as unknown as {
    trackId: string;
  };

  const loggedInUser = req.user as User | undefined;

  try {
    if (!loggedInUser) {
      throw new AppError({
        description: "Not logged in user",
        httpCode: 401,
      });
    } else {
      if (loggedInUser.isAdmin) {
        return next();
      }
      const track = await prisma.track.findFirst({
        where: {
          trackGroup: {
            artist: {
              userId: loggedInUser.id,
            },
          },
          id: Number(trackId),
        },
      });

      if (!track) {
        throw new AppError({
          description: "Track does not exist or does not belong to user",
          httpCode: 400,
        });
      }
    }
  } catch (e) {
    return next(e);
  }
  return next();
};

export const contentBelongsToLoggedInUserArtist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const data = req.body;

  const artistId = data.artistId ?? req.params.artistId;

  const loggedInUser = req.user as User | undefined;

  if (!loggedInUser) {
    res.status(401).json({ error: "Unauthorized" });
  } else {
    const artist = await prisma.artist.findFirst({
      where: {
        userId: loggedInUser.id,
        id: Number(artistId),
      },
    });

    if (!artist) {
      res.status(400).json({
        error: "Artist must belong to user",
      });
      return;
    }
  }
  return next();
};

export default {
  userLoggedInWithoutRedirect,
};
