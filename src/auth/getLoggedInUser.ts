import { Request } from "express";
import { AppError, HttpCode } from "../utils/error";

export function assertLoggedIn(
  req: Request
): asserts req is Request & { user: Express.User } {
  if (!req.user) {
    throw new AppError({
      httpCode: HttpCode.UNAUTHORIZED,
      description: "Unauthorized",
    });
  }
}
