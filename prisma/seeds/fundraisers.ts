import { Prisma } from "../__generated__";

export const fundraisers: Prisma.FundraiserCreateInput[] = [
  {
    name: "Help us finish the album",
    description:
      "We need your help to complete our upcoming album. Every pledge helps us cover studio costs and production expenses.",
    goalAmount: 500000, // $5000 in cents
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    isAllOrNothing: true,
    status: "ACTIVE",
    trackGroups: {
      connect: [
        {
          id: 1,
        },
      ],
    },
    pledges: {
      create: [
        {
          amount: 10000, // $100
          userId: 2,
          stripeSetupIntentId: "seti_2Nxxxxxx",
          paidAt: new Date(),
        },
        {
          amount: 25000, // $250
          userId: 3,
          stripeSetupIntentId: "seti_1Nxxxxxx",
          paidAt: null,
        },
      ],
    },
  },
  {
    name: "Tour Support Fund",
    description:
      "Help us bring our music to your city! We're raising funds for a national tour.",
    goalAmount: 750000, // $7500 in cents
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    isAllOrNothing: false,
    status: "ACTIVE",
  },
];
