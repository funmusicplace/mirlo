import prisma from "@mirlo/prisma";

export const numberSale = async (
  transactionId: string,
  sellerUserId: number
) => {
  const { saleCount } = await prisma.user.update({
    where: { id: sellerUserId },
    data: { saleCount: { increment: 1 } },
    select: { saleCount: true },
  });
  return prisma.userTransaction.update({
    where: { id: transactionId },
    data: { userFriendlyId: String(saleCount).padStart(4, "0") },
  });
};
