import prisma from "@mirlo/prisma";

export const FRONTEND_CLIENT_NAME = "frontend";

export const getClient = async () => {
  let client = await prisma.client.findFirst({
    where: { applicationName: FRONTEND_CLIENT_NAME, clientIdUrl: null },
    orderBy: { id: "asc" },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        applicationName: FRONTEND_CLIENT_NAME,
        applicationUrl: "http://localhost:8080",
      },
    });
  }
  return client;
};
