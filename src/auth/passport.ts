import { PrismaClient, User } from "@prisma/client";

import { NextFunction, Request, Response } from "express";
import { TokenExpiredError } from "jsonwebtoken";
import passport from "passport";
import passportJWT from "passport-jwt";
const JWTStrategy = passportJWT.Strategy;

const secret = process.env.JWT_SECRET;

const prisma = new PrismaClient();

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
    (jwtPayload, done) => {
      const { expiration, email } = jwtPayload;

      if (Date.now() > expiration) {
        done("Unauthorized", false);
      }
      prisma.user
        .findFirst({
          where: {
            email,
          },
        })
        .then((foundUser) => {
          if (!foundUser) {
            done("Unauthorized", false);
          }
          done(null, jwtPayload);
        });
    }
  )
);

export const userLoggedInWithoutRedirect = (
  req: Request,
  res: Response,
  next: any
) => {
  passport.authenticate(
    "jwt",
    { session: false },
    (err?: unknown, user?: Express.User, info?: any, status?: unknown) => {
      if (err) {
        return next(err);
      }
      if (info instanceof TokenExpiredError) {
        res.status(401).json({ error: info.message });
        return;
      }
      if (!user) {
        return next();
      }
      req.user = user;
      return next();
    }
  )(req, res, next);
};

export const userAuthenticated = (req: Request, res: Response, next: any) => {
  try {
    passport.authenticate("jwt", { session: false })(req, res, next);
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

export const userHasPermission = (role: "admin" | "owner") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params as unknown as { userId: number };
    const loggedInUser = req.user as User;

    // FIXME: ignore if user is admin.
    if (role === "owner" && Number(userId) !== loggedInUser.id) {
      res.status(401).json({ error: "Unauthorized" });
    }
    return next();
  };
};

export const contentBelongsToLoggedInUserArtist = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params as unknown as { userId: string };
    const data = req.body;

    const artistId = data.artistId ?? req.params.artistId;
    const loggedInUser = req.user as User;

    if (loggedInUser.id !== Number(userId)) {
      res.status(400).json({
        error: `Artist must belong to user`,
      });
      return next(`Artist must belong to user`);
    }

    const artist = await prisma.artist.findFirstOrThrow({
      where: {
        userId: loggedInUser.id,
        id: Number(artistId),
      },
    });

    if (!artist) {
      res.status(400).json({
        error: "Artist must belong to user",
      });
      return next("Artist must belong to user");
    }
    return next();
  };
};

export default {
  userLoggedInWithoutRedirect,
};
