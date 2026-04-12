declare global {
  namespace Express {
    interface User extends import("@mirlo/prisma/client").User {}
  }
}

export {};
