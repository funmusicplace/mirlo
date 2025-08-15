import rateLimit from "express-rate-limit";
import passport from "./auth/passport";
import prisma from "@mirlo/prisma";

export default rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: async (req, res) => {
    const settings = await prisma.settings.findFirst({});

    if (settings?.defconLevel === 2) {
      return 30;
    }

    if (settings?.defconLevel === 1) {
      return 60;
    }

    return 120;
  },
  handler: (req, res) => {
    console.log("Rate limit exceeded for", req.path);
    res.status(429).json({
      error: "Too many requests",
      message: "You have exceeded the request limit. Please try again later.",
    });
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers,
  skip: async (req, res) => {
    // skip the rate limiting for logged in users
    const isAuthenticated = await new Promise<boolean>((resolve) => {
      passport.authenticate(
        "jwt",
        { session: false },
        (err: unknown, user?: Express.User) => {
          if (err || !user) return resolve(false);
          resolve(true);
        }
      )(req, res, () => {});
    });
    // If the user is authenticated, skip the rate limiting
    if (isAuthenticated) return true;
    return false;
  },
});
