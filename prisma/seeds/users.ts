import { Prisma } from "../__generated__";

export const users: Prisma.UserCreateInput[] = [
  {
    email: "admin@admin.example",
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
