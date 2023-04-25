import express, { Response } from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { userAuthenticated } from "../auth/passport";
import prisma from "../../prisma/prisma";
import sendMail from "../jobs/send-mail";
import { User } from "@prisma/client";

const jwt_secret = process.env.JWT_SECRET ?? "";
const refresh_secret = process.env.REFRESH_TOKEN_SECRET ?? "";

const router = express.Router();

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 3);
}

router.post(`/signup`, async (req, res, next) => {
  let { name, email, password, client } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password must be supplied" });
    return next();
  }
  try {
    email = email.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (existing) {
      res.status(400).json({ error: "This user exists" });
    } else {
      const result = await prisma.user.create({
        data: {
          name,
          email,
          password: await hashPassword(password),
        },
        select: {
          name: true,
          email: true,
          emailConfirmationToken: true,
        },
      });

      await sendMail({
        data: {
          template: "new-user",
          message: {
            to: result.email,
          },
          locals: {
            user: result,
            host: process.env.API_DOMAIN,
            client,
          },
        },
      });

      res.json(result);
    }
  } catch (e) {
    console.error("An error was encountered signing up", e);
    res.status(500);
  }
});

router.get(`/confirmation/:emailConfirmationToken`, async (req, res, next) => {
  try {
    let { emailConfirmationToken } = req.params;

    // FIXME: should the client be changed from a URL to an id. Probably
    // And then check that the client exists in the DB.
    let { client, email } = req.query as { client: string; email: string };
    email = email.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email,
        emailConfirmationToken,
      },
    });

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
      return res.redirect(client);
    }
  } catch (e) {
    console.error(e);
    res.status(500);
  }
});

router.post(
  "/login",
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const foundUser = await prisma.user.findFirst({
        where: {
          email,
          emailConfirmationToken: null,
        },
      });
      if (foundUser) {
        const match = await bcrypt.compare(password, foundUser.password);
        if (match) {
          res.locals.user = foundUser;
          next();
        } else {
          res.status(400).json({
            error: "Incorrect username or password",
          });
        }
      } else {
        res.status(400).json({
          error: "Incorrect username or password",
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error });
    }
  },
  async (req, res) => {
    let user;
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
  }
);

router.get("/logout", (req, res) => {
  if (req.cookies["jwt"]) {
    res.clearCookie("jwt").clearCookie("refresh").status(200).json({
      message: "You have logged out",
    });
  } else {
    res.status(401).json({
      error: "Invalid jwt",
    });
  }
});

router.get("/profile", userAuthenticated, async (req, res) => {
  const { email } = req.user as { email: string };

  try {
    const foundUser = await prisma.user.findFirst({
      where: {
        email,
      },
      select: {
        email: true,
        id: true,
        name: true,
        artists: true,
        artistUserSubscriptions: {
          where: {
            deletedAt: null,
          },
          select: {
            artistSubscriptionTier: {
              include: {
                artist: true,
              },
            },
            id: true,
            userId: true,
            amount: true,
          },
        },
      },
    });

    res.status(200).json({ result: foundUser });
  } catch (e) {
    console.error("auth/profile", e);
    res.status(500);
  }
});

router.post("/refresh", (req, res) => {
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
          console.log("err", err);
          // Wrong Refesh Token
          return res.status(406).json({ message: "Unauthorized" });
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
    return res.status(406).json({ message: "Unauthorized" });
  }
});

const setTokens = (res: Response, user: { email: string; id: number }) => {
  const payload = {
    email: user.email,
    id: user.id,
  };

  const accessToken = jwt.sign(payload, jwt_secret, {
    expiresIn: "10m",
  });
  const refreshToken = jwt.sign(payload, refresh_secret, {
    expiresIn: "1d",
  });

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
