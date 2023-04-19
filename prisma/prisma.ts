import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware
 */

/**
 * We intercept deletions and soft delete them
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
      if (params.args.data != undefined) {
        params.args.data["deletedAt"] = new Date();
      } else {
        params.args["data"] = { deletedAt: new Date() };
      }
    }
  }
  return next(params);
});

export default prisma;
