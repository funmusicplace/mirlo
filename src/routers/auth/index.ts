import express, { Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { userAuthenticated } from "../../auth/passport";
import prisma from "@mirlo/prisma";

import profile from "./profile";
import signup from "./signup";
import refresh from "./refresh";
import login from "./login";
import verifyEmail from "./verifyEmail";
import {
  passwordResetConfirmation,
  passwordResetInitiate,
  passwordResetSetPassword,
} from "./passwordReset";

const jwt_secret = process.env.JWT_SECRET ?? "";
const refresh_secret = process.env.REFRESH_TOKEN_SECRET ?? "";

const router = express.Router();

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 3);
}

router.post(`/signup`, signup);

router.post(`/verify-email`, verifyEmail);

router.get(`/confirmation/:emailConfirmationToken`, async (req, res, next) => {
  try {
    let { emailConfirmationToken } = req.params;

    // FIXME: should the client be changed from a URL to an id. Probably
    // And then check that the client exists in the DB.
    let {
      client: clientID,
      user: userId,
      accountType,
    } = req.query as {
      client: string;
      accountType: "artist" | "listener";
      user: string;
    };

    const user = await prisma.user.findFirst({
      where: {
        id: Number(userId),
        emailConfirmationToken,
      },
    });

    const client = await prisma.client.findFirst({
      where: {
        id: Number(clientID),
      },
    });

    if (!client) {
      return res.status(404).json({ error: "This client does not exist" });
    }
    if (!user) {
      return res.status(404).json({ error: "This user does not exist" });
    } else if (
      user.emailConfirmationExpiration &&
      user.emailConfirmationExpiration < new Date()
    ) {
      return res.status(404).json({ error: "Token expired" });
    } else {
      const updatedUser = await prisma.user.update({
        data: {
          emailConfirmationToken: null,
          emailConfirmationExpiration: null,
        },
        where: {
          id: user.id,
        },
        select: {
          email: true,
          id: true,
        },
      });
      setTokens(res, updatedUser);
      if (accountType === "artist") {
        return res.redirect(`${client.applicationUrl}/manage/welcome`);
      }
      return res.redirect(`${client.applicationUrl}/profile/collection`);
    }
  } catch (e) {
    console.error(e);
    res.status(500);
  }
});

router.get("/password-reset/confirmation/:token", passwordResetConfirmation);

router.post(`/password-reset/initiate`, passwordResetInitiate);

router.post(`/password-reset/set-password`, passwordResetSetPassword);

router.post("/login", login, async (req, res, next) => {
  let user;
  try {
    if (res.locals.user) {
      user = res.locals.user;
    } else {
      res.status(400).json({
        error: "user not found",
      });
    }

    setTokens(res, user);

    res.status(200).json({
      message: "Success",
    });
  } catch (e) {
    console.error("Problem with logging in", e);
    next(e);
  }
});

export const clearJWT = (res: Response) => {
  return res.clearCookie("jwt").clearCookie("refresh");
};

router.get("/logout", (req, res) => {
  if (req.cookies["jwt"]) {
    clearJWT(res).status(200).json({
      message: "You have logged out",
    });
  } else {
    res.status(401).json({
      error: "Invalid jwt",
    });
  }
});

router.get("/profile", userAuthenticated, profile);

router.post("/refresh", refresh);

export const buildTokens = (user: { email: string; id: number }) => {
  const payload = {
    email: user.email,
    id: user.id,
  };

  const accessToken = jwt.sign(payload, jwt_secret, {
    expiresIn: "1w",
  });
  const refreshToken = jwt.sign(payload, refresh_secret, {
    expiresIn: "4w",
  });

  return { accessToken, refreshToken };
};

export const setTokens = (
  res: Response,
  user: { email: string; id: number }
) => {
  const { accessToken, refreshToken } = buildTokens(user);

  res
    .cookie("jwt", accessToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV !== "development" ? "strict" : undefined,
      secure: process.env.NODE_ENV !== "development",
    })
    .cookie("refresh", refreshToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV !== "development" ? "strict" : undefined,
      secure: process.env.NODE_ENV !== "development",
    });
};

export default router;
