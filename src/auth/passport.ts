import { PrismaClient } from "@prisma/client";

import { Request, response, Response } from "express";
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
        res.status(401);
        return next(info);
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
  passport.authenticate("jwt", { session: false })(req, res, next);
};

export const userHasPermission = (role: "admin" | "owner") => {
  // FIXME: this doesn't do anythign!
  return (req: Request, res: Response, next: any) => {
    return next();
  };
};

export default {
  userLoggedInWithoutRedirect,
};
