import express from "express";
import { rateLimit } from "express-rate-limit";

import { userAuthenticated } from "../../auth/passport";

import confirmEmailToken from "./confirmEmailToken";
import login from "./login";
import {
  passwordResetConfirmation,
  passwordResetInitiate,
  passwordResetSetPassword,
} from "./passwordReset";
import profile from "./profile";
import refresh from "./refresh";
import resendVerificationEmail from "./resendVerificationEmail";
import signup from "./signup";
import { clearJWT, setTokens } from "./utils";
import verifyEmail from "./verifyEmail";

const router = express.Router();

router.post(`/signup`, signup);

const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  skip: (req) => !!req.body?.code, // only limit email-sending, not code verification
});

router.post(`/verify-email`, verifyEmailLimiter, verifyEmail);

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
