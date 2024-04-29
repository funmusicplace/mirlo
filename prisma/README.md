The generated prisma client is configured in its own [Yarn workspace](https://yarnpkg.com/features/workspaces) with a custom output dir (`__generated__/`).

By default, prisma places its generated files in `node_modules`, which causes severe issues with Yarn 3+. Placing the client in a workspace package avoids this, and allows it to be imported as `@mirlo/prisma`.
