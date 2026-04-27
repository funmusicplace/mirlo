import prisma from "@mirlo/prisma";

export const getClient = async () => {
  let client = await prisma.client.findFirst({
    where: { applicationName: "frontend" },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        applicationName: "frontend",
        applicationUrl: "http://localhost:8080",
      },
    });
  }
  return client;
};
