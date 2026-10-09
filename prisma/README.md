The generated prisma client is configured in its own [Yarn workspace](https://yarnpkg.com/features/workspaces) with a custom output dir (`__generated__/`).

The generator emits TypeScript (`__generated__/client.ts`) rather than JS, so it's compiled along with `prisma.ts` into `dist/` by `yarn api:build`. Import it as `@mirlo/prisma/client`; the database connection (via `@prisma/adapter-pg`) is set up in `prisma.ts`, so import the client instance from `@mirlo/prisma` rather than constructing a new `PrismaClient`.
