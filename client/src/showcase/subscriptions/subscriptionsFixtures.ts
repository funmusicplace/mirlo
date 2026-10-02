/**
 * Data for the Showcase/Subscriptions stories: Lumen Tide's supporter tiers,
 * subscriber-only posts and a supporter list. Everything here is fictional.
 */
import { USER_EXAMPLE } from "../../../test/mocks";
import { COVERS, RELEASES, SHOWCASE_ARTIST } from "../shared/fixtures";

const image = (file: string) => {
  const url = `/showcase/${file}`;
  return {
    imageId: file,
    image: {
      id: file,
      url: [url],
      updatedAt: "2026-09-01T00:00:00Z",
      sizes: { 120: url, 625: url, 1250: url },
    },
  };
};

const included = (
  tierId: number,
  releases: TrackGroup[]
): SubscriptionTierRelease[] =>
  releases.map((trackGroup, i) => ({
    tierId,
    trackGroupId: trackGroup.id,
    trackGroup: trackGroup as SubscriptionTierRelease["trackGroup"],
    order: i,
    createdAt: "2026-01-01T00:00:00Z",
  }));

const tier = (
  overrides: Partial<ArtistSubscriptionTier> &
    Pick<ArtistSubscriptionTier, "id" | "name">
): ArtistSubscriptionTier => ({
  artistId: SHOWCASE_ARTIST.id,
  artist: SHOWCASE_ARTIST,
  description: "",
  interval: "MONTH",
  isDefaultTier: false,
  platformPercent: 7,
  images: [],
  ...overrides,
});

export const NEWSLETTER_TIER = tier({
  id: 701,
  name: "Newsletter",
  urlSlug: "newsletter",
  isDefaultTier: true,
  minAmount: 0,
  description: "Studio notes and tour dates, straight to your inbox.",
});

export const TIDE_POOL_TIER = tier({
  id: 702,
  name: "Tide Pool",
  urlSlug: "tide-pool",
  minAmount: 500,
  allowVariable: true,
  autoPurchaseAlbums: true,
  merchDiscountPercent: 10,
  images: [image("tier-tidepool.svg")],
  description:
    "Every new Lumen Tide record lands in your collection the day it comes out, plus subscriber-only posts from the boathouse: demos, tape-loop experiments and the stories behind the songs.\n\nPay what you like from $5 a month.",
  releases: included(702, [RELEASES.tidal, RELEASES.dusk]),
});

export const LIGHTHOUSE_TIER = tier({
  id: 703,
  name: "Lighthouse Keeper",
  urlSlug: "lighthouse-keeper",
  minAmount: 1500,
  autoPurchaseAlbums: true,
  digitalDiscountPercent: 20,
  merchDiscountPercent: 20,
  images: [image("tier-lighthouse.svg")],
  description:
    "Everything in Tide Pool, and the whole back catalogue is yours today.\n\nOnce a year we cut a one-off lathe record of unreleased songs and post it to every Lighthouse Keeper, hand-numbered with a note from us. You'll also get first dibs on show tickets and 20% off everything in the store.",
  releases: included(703, Object.values(RELEASES)),
});

/** Tide Pool perks, billed yearly, to show off the yearly interval */
export const YEARLY_TIER = tier({
  id: 704,
  name: "A Year at Sea",
  urlSlug: "a-year-at-sea",
  interval: "YEAR",
  minAmount: 5000,
  allowVariable: true,
  autoPurchaseAlbums: true,
  digitalDiscountPercent: 10,
  merchDiscountPercent: 10,
  images: [image("tier-yearly.svg")],
  description:
    "Everything in Tide Pool, paid once a year so you get two months on us. A good one to give as a gift.",
  releases: included(704, [RELEASES.tidal, RELEASES.dusk]),
});

export const TIERS = [
  NEWSLETTER_TIER,
  TIDE_POOL_TIER,
  YEARLY_TIER,
  LIGHTHOUSE_TIER,
];

/** A fan visiting Lumen Tide's page */
export const FAN: LoggedInUser = {
  ...USER_EXAMPLE,
  id: 42,
  name: "Maya Okafor",
  email: "maya.okafor@fastmail.com",
  artists: [],
  artistUserSubscriptions: [],
};

export const subscribedFan = (
  subscriptionTier: ArtistSubscriptionTier,
  amount = subscriptionTier.minAmount ?? 0
): LoggedInUser => ({
  ...FAN,
  artistUserSubscriptions: [
    {
      id: 9001,
      amount,
      userId: FAN.id,
      artistSubscriptionTierId: subscriptionTier.id,
      artistSubscriptionTier: subscriptionTier,
    },
  ],
});

/** Lumen Tide's own account, for the manage pages */
export const OWNER: LoggedInUser = {
  ...USER_EXAMPLE,
  id: SHOWCASE_ARTIST.userId,
  name: "Wren Hollis",
  email: "wren@lumentide.ca",
  artists: [SHOWCASE_ARTIST],
};

const POST_BASE = {
  artistId: SHOWCASE_ARTIST.id,
  artist: SHOWCASE_ARTIST,
  isPublic: false,
  isDraft: false,
  isContentHidden: false,
};

export const SUBSCRIBER_POST: Post = {
  ...POST_BASE,
  id: 801,
  urlSlug: "boathouse-demos",
  title: "Boathouse demos, and a song that almost didn't make it",
  publishedAt: "2026-09-24T15:00:00Z",
  minimumSubscriptionTierId: TIDE_POOL_TIER.id,
  postSubscriptionTiers: [
    { profileSubscriptionTierId: TIDE_POOL_TIER.id },
    { profileSubscriptionTierId: LIGHTHOUSE_TIER.id },
  ],
  featuredImage: { src: "/showcase/banner.svg" },
  featuredImageCredit: "Ada Rivers",
  content: `
<p>Hi everyone. Thank you, truly, for being here. Your support is the reason we could spend the whole winter in the boathouse instead of picking up extra shifts.</p>
<p>Below are three rough demos from those sessions. "Fog Bell" was recorded at 2am with the harmonium mic'd from across the room, and you can hear the tide coming in under the floor about halfway through. We nearly cut it from <em>Tidal Hours</em>, but it ended up being the song people ask about most.</p>
<h3>What's next</h3>
<ul>
<li>The Lighthouse Keeper lathe cuts go out in November. Check your address in your account settings.</li>
<li>We're playing a tiny living-room show in Lunenburg on October 18. Supporters get the address first.</li>
<li>New tape-loop pieces are coming together for a spring EP. You'll hear them here before anyone else.</li>
</ul>
<p>Talk soon,<br/>Wren &amp; Jonah</p>
`,
};

export const LOCKED_POST: Post = {
  ...SUBSCRIBER_POST,
  isContentHidden: true,
  content: "",
};

export const PUBLIC_POSTS: Post[] = [
  {
    ...POST_BASE,
    id: 802,
    urlSlug: "tidal-hours-is-out",
    isPublic: true,
    title: "Tidal Hours is out today",
    publishedAt: "2026-09-12T13:00:00Z",
    featuredImage: { src: COVERS.tidal.sizes[600] },
    content:
      "<p>Six songs, one long winter, and a lot of tape. Tidal Hours is out now on Mirlo. Thank you for listening.</p>",
  },
  {
    ...POST_BASE,
    id: 803,
    urlSlug: "autumn-shows",
    isPublic: true,
    title: "Autumn shows on the south shore",
    publishedAt: "2026-08-30T13:00:00Z",
    content:
      "<p>We're heading out for a handful of small shows this autumn: Lunenburg, Mahone Bay and a library in Liverpool. Bring a sweater.</p>",
  },
];

const BANNER = SHOWCASE_ARTIST.background!;

export const ARTIST_WITH_TIERS: Artist = {
  ...SHOWCASE_ARTIST,
  // The page background reads the 2500px size
  background: {
    ...BANNER,
    sizes: { ...BANNER.sizes!, 2500: "/showcase/banner.svg" },
  },
  trackGroups: Object.values(RELEASES),
  subscriptionTiers: TIERS,
  posts: [LOCKED_POST, ...PUBLIC_POSTS],
};

const DEMO_TRACK_TITLES = [
  ["Fog Bell (boathouse demo)", 251],
  ["Harbour Lights (harmonium sketch)", 188],
  ["Untitled tape loop no. 4", 143],
] as const;

export const DEMO_TRACKS: Track[] = DEMO_TRACK_TITLES.map(
  ([title, duration], i) => ({
    ...RELEASES.tidal.tracks[i],
    id: 8101 + i,
    title,
    trackGroup: RELEASES.tidal,
    audio: { ...RELEASES.tidal.tracks[i].audio!, duration },
  })
);

export const SUBSCRIBER_POST_WITH_DEMOS: Post = {
  ...SUBSCRIBER_POST,
  tracks: DEMO_TRACKS.map((track) => ({
    postId: SUBSCRIBER_POST.id,
    trackId: track.id,
    isPlayable: true,
    title: track.title,
    audioDuration: track.audio?.duration,
  })),
  trackCount: DEMO_TRACKS.length,
};

// --- Supporter list, for the manage pages ---------------------------------

const SUPPORTER_PEOPLE: [string, string, number, number, string][] = [
  // name, email, tier id, amount (cents), joined
  ["Maya Okafor", "maya.okafor@fastmail.com", 702, 700, "2026-09-28"],
  ["Elliot Brandt", "elliot.brandt@gmail.com", 703, 1500, "2026-09-26"],
  ["Sofía Reyes", "sofia.reyes@proton.me", 702, 500, "2026-09-21"],
  ["Hannah Lindqvist", "hlindqvist@outlook.com", 703, 2000, "2026-09-15"],
  ["Kofi Mensah", "kofi.mensah@gmail.com", 704, 5000, "2026-09-12"],
  ["Priya Natarajan", "priya.n@hey.com", 702, 500, "2026-09-12"],
  ["Tom Gallagher", "tgallagher@icloud.com", 703, 1500, "2026-08-30"],
  ["Inès Moreau", "ines.moreau@free.fr", 702, 600, "2026-08-22"],
  ["Daniel Cho", "dcho.music@gmail.com", 702, 500, "2026-08-14"],
  ["Ruth Abernathy", "ruth.abernathy@gmail.com", 703, 2500, "2026-07-30"],
  ["Mateus Silva", "mateus.silva@uol.com.br", 702, 500, "2026-07-19"],
  ["Grace Whitfield", "grace@whitfield.studio", 704, 6000, "2026-07-02"],
  ["Jonas Becker", "jonas.becker@posteo.de", 703, 1500, "2026-06-21"],
  ["Aiyana Redcloud", "aiyana.rc@gmail.com", 702, 500, "2026-06-05"],
  ["Liam O'Connell", "liam.oconnell@eircom.net", 702, 500, "2026-05-17"],
  ["Noor Haddad", "noor.haddad@gmail.com", 703, 1500, "2026-04-09"],
  ["Ama Boateng", "ama.boateng@gmail.com", 704, 5000, "2026-03-14"],
  ["Pete Lindsay", "pete.lindsay@shaw.ca", 702, 500, "2026-02-27"],
];

const FOLLOWER_PEOPLE: [string, string][] = [
  ["Beatrice Lowe", "bea.lowe@gmail.com"],
  ["Samir Patel", "samir.patel@outlook.com"],
  ["Clara Johansson", "clara.j@telia.se"],
  ["Marcus Bell", "marcus.bell@icloud.com"],
  ["Yuki Tanaka", "yuki.tanaka@gmail.com"],
  ["Olivia Grant", "olivia.grant@hey.com"],
  ["Felix Novak", "felix.novak@seznam.cz"],
  ["Amara Eze", "amara.eze@gmail.com"],
];

const tierById = (id: number) => TIERS.find((t) => t.id === id)!;

export type ShowcaseSubscriber = {
  id: number;
  user: { id: number; name: string; email: string };
  createdAt: string;
  amount: number;
  deleteReason?: string | null;
  nextBillingDate?: string;
  artistSubscriptionTier: ArtistSubscriptionTier;
  artistUserSubscriptionCharges: {
    id: string;
    transactionId?: string;
    transaction?: {
      platformCut: number;
      stripeCut: number;
      paymentStatus: "COMPLETED";
    };
  }[];
};

const nextBilling = (joined: string, tierId: number) =>
  tierId === YEARLY_TIER.id
    ? `2027-${joined.slice(5, 10)}T12:00:00Z`
    : `2026-10-${joined.slice(8, 10)}T12:00:00Z`;

export const SUPPORTERS: ShowcaseSubscriber[] = SUPPORTER_PEOPLE.map(
  ([name, email, tierId, amount, joined], i) => ({
    id: 1000 + i,
    user: { id: 500 + i, name, email },
    createdAt: `${joined}T12:00:00Z`,
    amount,
    nextBillingDate: nextBilling(joined, tierId),
    // One supporter is winding down, one was comped by the band
    deleteReason: i === 10 ? "Moving overseas, back soon!" : null,
    artistSubscriptionTier: tierById(tierId),
    artistUserSubscriptionCharges:
      i === 13
        ? []
        : [
            {
              id: `ch_${i}`,
              transactionId: `tx_${i}`,
              transaction: {
                platformCut: Math.round(amount * 0.07),
                stripeCut: Math.round(amount * 0.029 + 30),
                paymentStatus: "COMPLETED",
              },
            },
          ],
  })
);

export const followerRow = (
  [name, email]: [string, string],
  i: number
): ShowcaseSubscriber => ({
  id: 2000 + i,
  user: { id: 700 + i, name, email },
  createdAt: "2026-06-01T12:00:00Z",
  amount: 0,
  artistSubscriptionTier: NEWSLETTER_TIER,
  artistUserSubscriptionCharges: [],
});

export const FOLLOWERS = FOLLOWER_PEOPLE.map(followerRow);

/** What the band pastes into the import dialog in the import story */
export const IMPORTED_EMAILS = [
  "june.harper@gmail.com",
  "callum.reid@btinternet.com",
  "noa.levi@proton.me",
  "rosa.delgado@yahoo.com",
];

export const SUPPORTERS_CSV = [
  "email,name,tier,amount,interval,since",
  ...SUPPORTERS.map(
    (s) =>
      `${s.user.email},${s.user.name},${s.artistSubscriptionTier.name},${(
        s.amount / 100
      ).toFixed(2)},monthly,${s.createdAt.slice(0, 10)}`
  ),
  ...FOLLOWERS.map(
    (f) => `${f.user.email},${f.user.name},Newsletter,0.00,,2026-06-01`
  ),
].join("\n");
