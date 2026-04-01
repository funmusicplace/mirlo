import express, { Response } from "express";
import { userAuthenticated } from "../../auth/passport";
import prisma from "@mirlo/prisma";

import profile from "./profile";
import signup from "./signup";
import refresh from "./refresh";
import login from "./login";
import verifyEmail from "./verifyEmail";
import resendVerificationEmail from "./resendVerificationEmail";
import confirmEmailToken from "./confirmEmailToken";
import {
  passwordResetConfirmation,
  passwordResetInitiate,
  passwordResetSetPassword,
} from "./passwordReset";
import { clearJWT, setTokens } from "./utils";

const router = express.Router();

router.post(`/signup`, signup);

router.post(`/verify-email`, verifyEmail);

router.post(`/confirm-email-token`, confirmEmailToken);

router.post(`/resend-verification-email`, resendVerificationEmail);

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

export default router;
