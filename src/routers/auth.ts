import express from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { userAuthenticated } from "../auth/passport";
import prisma from "../../prisma/prisma";

const jwt_secret = process.env.JWT_SECRET ?? "";
const refresh_secret = process.env.REFRESH_TOKEN_SECRET ?? "";

const router = express.Router();

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 3);
}

router.post(`/signup`, async (req, res, next) => {
  let { name, email, password } = req.body;
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
        artists: true,
      },
    });
    res.json(result);
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

    const payload = {
      email: user.email,
      id: user.id,
    };

    const accessToken = jwt.sign(payload, jwt_secret, {
      expiresIn: "10m",
    });

    const refreshToken = jwt.sign(payload, refresh_secret, { expiresIn: "1d" });
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
      })
      .status(200)
      .json({
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

  const foundUser = await prisma.user.findFirst({
    where: {
      email,
    },
    select: {
      email: true,
      id: true,
      name: true,
      artistUserSubscriptions: {
        select: {
          artistSubscriptionTier: {
            select: {
              artist: true,
              name: true,
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

          const payload = {
            email: foundUser.email,
            id: foundUser.id,
          };

          const accessToken = jwt.sign(payload, jwt_secret, {
            expiresIn: "10m",
          });
          const refreshToken = jwt.sign(payload, refresh_secret, {
            expiresIn: "1d",
          });

          return res
            .cookie("jwt", accessToken, {
              httpOnly: true,
              sameSite:
                process.env.NODE_ENV !== "development" ? "strict" : undefined,
              secure: process.env.NODE_ENV !== "development",
            })
            .cookie("refresh", refreshToken, {
              httpOnly: true,
              sameSite:
                process.env.NODE_ENV !== "development" ? "strict" : undefined,
              secure: process.env.NODE_ENV !== "development",
            })
            .status(200)
            .json({
              message: "Success",
            });
        }
      }
    );
  } else {
    return res.status(406).json({ message: "Unauthorized" });
  }
});

export default router;
