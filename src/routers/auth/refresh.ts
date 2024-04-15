import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/error";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { clearJWT, setTokens } from ".";
import prisma from "../../../prisma/prisma";

const refresh_secret = process.env.REFRESH_TOKEN_SECRET ?? "";

const refresh = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.cookies?.refresh) {
      // Destructuring refreshToken from cookie
      const refreshToken = req.cookies.refresh;
      // Verifying refresh token
      jwt.verify(
        refreshToken,
        refresh_secret,
        {},
        async (err: VerifyErrors | null, decoded?: JwtPayload | string) => {
          if (err) {
            console.error(err);
            // Wrong Refesh Token
            clearJWT(res);
            return res.status(406).json({ error: "Unauthorized" });
          } else {
            // Correct token we send a new access token

            const foundUser = await prisma.user.findFirst({
              where: {
                email: (decoded as JwtPayload)?.email,
              },
            });

            if (!foundUser) {
              return res.status(401).json({ message: "Unauthorized" });
            }

            setTokens(res, foundUser);

            res.status(200).json({
              message: "Success",
            });
          }
        }
      );
    } else {
      if (req.cookies?.jwt) {
        return res
          .status(406)
          .json({ message: "Should not have a JWT without a refresh token" });
      } else {
        return res
          .status(400)
          .json({ message: "Shouldn't request refresh if not logged in" });
      }
    }
  } catch (e) {
    console.log("has an error, passing it along", e);
    next(e);
  }
};

export default refresh;
