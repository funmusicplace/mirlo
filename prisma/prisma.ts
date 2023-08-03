import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  // The following controls logging of the database
  // log: [
  //   {
  //     emit: "event",
  //     level: "query",
  //   },
  // ],
});

/**
 * Middleware
 */

// @ts-ignore
prisma.$on("query", (e) => {
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
 * We intercept deletions for models with a `deletedAt` field
 * and instead soft delete them.
 *
 * It does NOT cascade delete.
 */
prisma.$use(async (params, next) => {
  const hasDeletedAtField = Prisma.dmmf.datamodel.models
    .find((m) => m.name === params.model)
    ?.fields.find((field) => field.name === "deletedAt");
  // Check incoming query type
  if (!!hasDeletedAtField) {
    if (params.action == "delete") {
      // Delete queries
      // Change action to an update
      params.action = "update";
      params.args["data"] = { deletedAt: new Date() };
    }
    if (params.action == "deleteMany") {
      // Delete many queries
      params.action = "updateMany";
      if (params.args.data !== undefined) {
        params.args.data["deletedAt"] = new Date();
      } else {
        params.args["data"] = { deletedAt: new Date() };
      }
    }
  }
  return next(params);
});

/**
 * We intercept find or findMany on models that have a deletedAt
 * so that it filters out null values.
 *
 * It does NOT work for nested `where`, `include`, or `select` things
 */
prisma.$use(async (params, next) => {
  const hasDeletedAtField = Prisma.dmmf.datamodel.models
    .find((m) => m.name === params.model)
    ?.fields.find((field) => field.name === "deletedAt");

  if (!!hasDeletedAtField) {
    // FIXME: how do we make this work for nested queries?
    if (params.action === "findFirst" || params.action === "findMany") {
      if (!params.args) {
        params.args = { where: { deletedAt: null } };
      } else if (!params.args.where) {
        params.args.where = { deletedAt: null };
      } else if (
        params.args.where !== undefined &&
        params.args.where.deletedAt === undefined
      ) {
        params.args.where["deletedAt"] = null;
      }
    }
  }
  return next(params);
});

export default prisma;
