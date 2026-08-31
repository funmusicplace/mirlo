import { Prisma, PrismaClient } from "./__generated__";

const ENABLE_LOGGING = false;

// Fields on `User` that can't leave the server
export const SECRET_USER_FIELDS = {
  password: true,
  refresh: true,
  emailConfirmationToken: true,
  passwordResetConfirmationToken: true,
  userConfirmationCode: true,
  pendingEmailToken: true,
} as const;

// A SafeUser is one that omits the secret fields
export type SafeUser = Prisma.UserGetPayload<{
  omit: typeof SECRET_USER_FIELDS;
}>;

// Create base client before extending it
const baseClient = new PrismaClient({
  // The following controls logging of the database
  ...(ENABLE_LOGGING
    ? {
        log: [
          {
            emit: "event",
            level: "query",
          },
        ],
      }
    : {}),
  // Secrets that can't leave the server by accident.  Queries that need one can
  // opt back in, e.g. `omit: { password: false }`.
  omit: {
    user: SECRET_USER_FIELDS,
  },
});

/**
 * Middleware
 */

// @ts-ignore
baseClient.$on("query", (e) => {
  // @ts-ignore
  let queryString = e.query;
  // @ts-ignore
  JSON.parse(e.params).forEach((param, index) => {
    queryString = queryString.replace(
      `$${index + 1}`,
      typeof param === "string" ? `'${param}'` : param
    );
  });

  console.log(queryString);
});

/**
 * Client extension for soft deletes and filtered queries.
 *
 * - Intercepts delete/deleteMany to soft delete (update deletedAt)
 * - Intercepts find/findMany to filter out soft-deleted records
 *
 * It does NOT cascade delete and does NOT work for nested `where`, `include`, or `select` things
 */
const prisma = baseClient.$extends({
  query: {
    userTransaction: {
      async create({ args, query }) {
        const count = await baseClient.userTransaction.count({
          where: { userId: args.data.userId },
        });
        args.data.userFriendlyId = String(count + 1).padStart(4, "0");
        return query(args);
      },
    },
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const hasDeletedAtField = Prisma.dmmf.datamodel.models
          .find((m) => m.name === model)
          ?.fields.find((field) => field.name === "deletedAt");

        if (!hasDeletedAtField) {
          return query(args);
        }

        // Handle delete -> update soft delete
        if (operation === "delete") {
          // @ts-ignore
          return baseClient[model].update({
            where: args.where,
            data: { deletedAt: new Date() } as any,
          });
        }

        // Handle deleteMany -> updateMany soft delete
        if (operation === "deleteMany") {
          // @ts-ignore
          return baseClient[model].updateMany({
            where: args.where,
            data: { deletedAt: new Date() } as any,
          });
        }

        // Handle findFirst and findMany to filter out soft deleted.

        // In case that a findMany or findFirst need to include deleted entities using
        // nested conditions (i.e. OR, AND) it is needed to add a hacky deletedAt
        // in the where root
        // where:{
        //   AND: [...]
        //   deletedAt: {}
        // }
        if (operation === "findFirst" || operation === "findMany") {
          const whereArgs = (args.where as any) || {};
          if (whereArgs.deletedAt === undefined) {
            whereArgs.deletedAt = null;
            args.where = whereArgs;
          }
        }

        return query(args);
      },
    },
  },
});

export default prisma;
