/**
 * Fixtures for the all-or-nothing fundraiser showcase: a vinyl pressing
 * campaign for Lumen Tide's "Tidal Hours". Dates are relative to now so
 * "closes on ..." copy always reads as upcoming.
 */
import { RELEASES } from "../shared/fixtures";

export const FUNDRAISER_ID = 31;
export const GOAL_CENTS = 400000; // $4,000

const DAY = 24 * 60 * 60 * 1000;

export const daysFromNow = (days: number) =>
  new Date(Date.now() + days * DAY).toISOString();

const closeDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" });

export const makeFundraiser = ({
  daysLeft,
  status = "ACTIVE",
  funded = false,
}: {
  daysLeft: number;
  status?: "ACTIVE" | "SUCCESSFUL" | "FAILED";
  /** Swap the blurb for the artist's "we did it" update */
  funded?: boolean;
}): NonNullable<TrackGroup["fundraiser"]> => {
  const endDate = daysFromNow(daysLeft);
  const closes = closeDateLabel(endDate);
  return {
    id: FUNDRAISER_ID,
    goalAmount: GOAL_CENTS,
    isAllOrNothing: true,
    endDate,
    status,
    name: "Press Tidal Hours on vinyl",
    description: funded
      ? `We did it! Thank you to every single backer: 300 copies of Tidal Hours on 180g sea-glass blue vinyl are going to the pressing plant.\n\nYou can still pledge until ${closes} to claim one of the last records.`
      : `Help us press 300 copies of Tidal Hours on 180g sea-glass blue vinyl, with a gatefold sleeve and hand-stamped labels. Every backer gets the album now and a record in the mail next spring.\n\nYou're only charged if we hit the goal. Pledges close on ${closes}.`,
  };
};

export const fundraiserRelease = (
  fundraiser: NonNullable<TrackGroup["fundraiser"]>
): TrackGroup => ({
  ...RELEASES.tidal,
  fundraiserId: FUNDRAISER_ID,
  fundraiser,
  minPrice: 1000,
  suggestedPrice: 3500,
  isGettable: true,
  publishedAt: "2026-09-12T00:00:00Z",
  about:
    "Recorded over a long winter in a converted boathouse on the Eastern Shore. Six slow songs about weather, harbours and the people who wait for boats to come in.",
  credits:
    "Written and performed by Lumen Tide.\nMixed by Ada Rivers. Mastered by Theo Marsh.\nCover photograph by Iris Kowalczyk.",
  tags: ["ambient folk", "harmonium", "tape loops", "halifax"],
  artist: {
    ...RELEASES.tidal.artist,
    user: { currency: "usd" },
  },
});

/** A fan (not the artist), so the release page shows the public view */
export const FAN_USER: LoggedInUser = {
  id: 204,
  email: "maya.okafor@fastmail.com",
  name: "Maya Okafor",
  artists: [],
  isAdmin: false,
  isLabelAccount: false,
  currency: "usd",
};

const FIRST_NAMES = [
  "Maya",
  "Jonah",
  "Priya",
  "Tomás",
  "Elise",
  "Kwame",
  "Hannah",
  "Rory",
  "Aiko",
  "Sam",
  "Lucía",
  "Felix",
  "Nora",
  "Dev",
  "Clara",
  "Owen",
  "Ingrid",
  "Marcus",
  "Zara",
  "Theo",
  "Amara",
  "Callum",
  "Mei",
  "Gabriel",
  "Freya",
  "Idris",
  "Sofia",
  "Elliot",
  "Noor",
  "Jasper",
  "Anika",
  "Mateo",
  "Ruth",
];
const LAST_NAMES = [
  "Okafor",
  "Whitfield",
  "Raman",
  "Ferreira",
  "Dubois",
  "Asante",
  "Lindqvist",
  "MacLeod",
  "Tanaka",
  "Okonkwo",
  "Moreno",
  "Brandt",
  "Kelly",
  "Malhotra",
  "Nguyen",
  "Pritchard",
  "Solberg",
  "Bell",
  "Hussain",
  "Lambert",
  "Byrne",
  "Castillo",
  "Haddad",
  "Novak",
  "Eriksen",
];
const DOMAINS = [
  "fastmail.com",
  "proton.me",
  "gmail.com",
  "outlook.com",
  "icloud.com",
  "hey.com",
  "posteo.de",
];
const AMOUNTS = [3500, 5000, 2500, 3500, 2000, 3500, 10000, 2500, 3500, 1500];

/**
 * Backers whose pledges add up to exactly `totalCents`, so the artist's
 * pledges page agrees with the thermometer on the release page.
 */
const makeBackers = (count: number, totalCents: number) => {
  const backers = Array.from({ length: count }, (_, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    const handle = `${first}.${last}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    return {
      name: `${first} ${last}`,
      email: `${handle}@${DOMAINS[i % DOMAINS.length]}`,
      amount: AMOUNTS[i % AMOUNTS.length],
    };
  });
  const sum = backers.reduce((total, b) => total + b.amount, 0);
  // Spread the difference across backers in $5 steps, keeping a $10 floor
  let diff = totalCents - sum;
  for (let i = 0; diff !== 0; i = (i + 1) % count) {
    const step = Math.sign(diff) * Math.min(500, Math.abs(diff));
    if (backers[i].amount + step >= 1000) {
      backers[i].amount += step;
      diff -= step;
    }
  }
  return backers;
};

/** Mid-campaign: 41 backers, $1,600 (40% of the goal) */
export const ACTIVE_CAMPAIGN = { backers: 41, raisedCents: 160000 };
/** Goal reached: 118 backers, $4,385 */
export const FUNDED_CAMPAIGN = { backers: 118, raisedCents: 438500 };

/** Pledges as the artist's pledges page receives them, newest first */
export const makePledges = ({
  charged,
  includeCancelled,
}: {
  charged: boolean;
  includeCancelled: boolean;
}): FundraiserPledge[] => {
  const campaign = charged ? FUNDED_CAMPAIGN : ACTIVE_CAMPAIGN;
  const spanDays = charged ? 28 : 12;
  const backers = makeBackers(campaign.backers, campaign.raisedCents);
  const pledges = backers.map(({ name, email, amount }, i) => {
    const createdAt = new Date(
      Date.now() - ((i + 0.3) / backers.length) * spanDays * DAY
    ).toISOString();
    return {
      id: 900 + i,
      userId: 300 + i,
      fundraiserId: FUNDRAISER_ID,
      amount,
      createdAt,
      cancelledAt: null as string | null,
      paidAt: charged ? daysFromNow(-0.1) : null,
      user: {
        id: 300 + i,
        name,
        email,
        artists: [],
        currency: "usd",
        createdAt,
        updatedAt: createdAt,
      },
    };
  });
  if (includeCancelled) {
    pledges.splice(4, 0, {
      ...pledges[4],
      id: 899,
      userId: 299,
      amount: 3500,
      cancelledAt: daysFromNow(-1),
      paidAt: null,
      user: {
        ...pledges[4].user,
        id: 299,
        name: "Ben Harrow",
        email: "ben.harrow@gmail.com",
      },
    });
  }
  return pledges;
};

export const managedFundraiser = (daysLeft: number) => {
  const fundraiser = makeFundraiser({ daysLeft });
  return { ...fundraiser, trackGroups: [fundraiserRelease(fundraiser)] };
};
