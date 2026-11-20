UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");

ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase" CHECK ("email" = lower("email"));
