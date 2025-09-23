import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Response } from "express";

const jwt_secret = process.env.JWT_SECRET ?? "";
const refresh_secret = process.env.REFRESH_TOKEN_SECRET ?? "";

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 3);
}

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

export const clearJWT = (res: Response) => {
  return res.clearCookie("jwt").clearCookie("refresh");
};
