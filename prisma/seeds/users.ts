import { Prisma } from "@prisma/client";

export const users: Prisma.UserCreateInput[] = [
  {
    email: "admin@admin.com",
    name: "Admin",
    password: "",
    isAdmin: true,
    refresh: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    currency: null,
    emailConfirmationToken: null,
    emailConfirmationExpiration: null,
    passwordResetConfirmationExpiration: null,
    passwordResetConfirmationToken: null,
    stripeAccountId: null,
  },
];
