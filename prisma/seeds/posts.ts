import { randomUUID } from "crypto";

import prisma from "../prisma";

const SHORT_CONTENT = `<p>The dawn chorus begins before the sun rises. Birds have been singing at dawn for millions of years, and there's a reason for it — the cool, moist morning air carries sound farther, making each call more effective for attracting mates and warning off rivals.</p>
<p>If you've never sat outside before first light and just listened, I highly recommend it. Bring coffee. Bring a blanket. You won't regret it.</p>`;

const LONG_CONTENT = `<p>Over the past year I've been keeping detailed notes on the birds that visit my garden, and I thought it was time to share some of what I've learned. This is going to be a long one, so grab a drink.</p>
<p>January was dominated by the usual suspects: blue tits, great tits, and the occasional coal tit. The feeders I put up in December were immediately popular, and by mid-month I had a regular flock of around twenty birds visiting every morning. The hierarchy at the peanut feeder was fascinating to watch — great tits almost always displaced blue tits, but a particularly feisty individual I started calling "Napoleon" (a blue tit, obviously) managed to hold his own against birds twice his size.</p>
<p>February brought a cold snap that drove fieldfares and redwings into the garden in numbers I'd never seen before. These Scandinavian thrushes were stripping the holly berries at an alarming rate. By Valentine's Day the tree was completely bare, and the birds had moved on. There's something melancholy about that — a week of drama and then silence.</p>
<p>March is when things get really interesting. The resident robins, who had maintained a careful truce through the winter sharing the territory, suddenly turned hostile. The male began singing from the very top of the apple tree at 5:30am, and the boundary disputes were daily events. I watched one confrontation that lasted nearly twenty minutes: two robins facing each other across the lawn, puffing their red breasts, edging forward and back in a slow-motion standoff. Eventually one simply flew away. I never could tell if it was the same birds each day.</p>
<p>By April the swallows were back. I always feel a kind of relief when I see the first one — proof that the world is still working, that the migration routes are still open, that somewhere on the other side of the planet the same birds I watched leave in September have successfully crossed the Sahara and returned. It never stops feeling like a small miracle.</p>
<p>May was the month of the garden warbler. I heard it before I saw it — a rich, sustained outpouring from inside the climbing rose, going on for minutes at a time. I spent three separate mornings trying to get a look at the singer before I finally caught a glimpse: a small, brown, completely undistinguished-looking bird. The song is so much larger than the bird. I find that oddly comforting.</p>
<p>There's more to tell — a sparrowhawk that has taken to sitting on the fence post, a pair of long-tailed tits building their elaborate nest in the hawthorn, the mystery of where the house sparrows disappeared to in June — but I'll save those for another post. The point is: you don't need to go far to see extraordinary things. Sometimes you just need to look out your own window.</p>`;

const SUBSCRIBER_CONTENT = `<p>This is the part I don't share publicly: the business side of being an independent artist is genuinely hard, and I want to be honest with you about that because you're helping make it possible.</p>
<p>Last quarter I released three singles. The total streaming revenue across all platforms was enough to buy approximately four bags of bird seed. Bandcamp was better — significantly better — but "better than almost nothing" is a low bar. The money that actually pays rent comes from live performances, licensing, and from people like you who subscribe here.</p>
<p>I'm not complaining. I chose this, and I'd choose it again. But I do think it's worth being transparent about where the music economy actually sits for artists at my level, because the mythology of "just put it out there and the algorithm will find you" is still doing a lot of damage. It doesn't work that way, and pretending it does just makes people feel like they're failing when they're actually just dealing with a broken system.</p>
<p>What I'm working on next: a longer piece about recording in unusual spaces. I spent two days last month in an empty warehouse in Leith, and the recordings I got there are unlike anything I've done before. More on that soon.</p>
<p>Thank you, genuinely, for being here.</p>`;

const TIER_EXCLUSIVE_CONTENT = `<p>Right, so this is the stuff I only share with tier members. Welcome.</p>
<p>The album is real, and it's further along than I've let on publicly. I have twelve tracks recorded and nine of them are basically done. The hold-up is one song that I keep rewriting — I know what it needs to be, I just haven't found the right version yet. It's been six months. At this point it's personal.</p>
<p>I'm also considering self-releasing rather than going through a distributor for this one. The margins are better and I have enough of an audience now that I think I can make it work. The downside is everything else — promotion, logistics, all the things a label (even a small one) normally handles. I'd love to hear your thoughts if you have experience with this.</p>
<p>There will be a listening session for subscribers before the public release. I'll send details once I have a finish date that I actually believe in.</p>`;

export async function seedPosts() {
  const blackbird = await prisma.artist.findFirst({
    where: { urlSlug: "blackbird" },
  });
  const crow = await prisma.artist.findFirst({ where: { urlSlug: "crow" } });

  if (!blackbird || !crow) {
    console.log("Required artists not found, skipping post seeding");
    return;
  }

  // Subscription tiers
  let blackbirdSupporterTier = await prisma.artistSubscriptionTier.findFirst({
    where: { artistId: blackbird.id, name: "Supporter" },
  });
  if (!blackbirdSupporterTier) {
    blackbirdSupporterTier = await prisma.artistSubscriptionTier.create({
      data: {
        name: "Supporter",
        description: "Support Blackbird and get access to exclusive posts",
        artistId: blackbird.id,
        minAmount: 500,
        defaultAmount: 500,
        currency: "usd",
      },
    });
    console.log(
      `Created Blackbird Supporter tier: ${blackbirdSupporterTier.id}`
    );
  }

  let blackbirdInnerCircleTier = await prisma.artistSubscriptionTier.findFirst({
    where: { artistId: blackbird.id, name: "Inner Circle" },
  });
  if (!blackbirdInnerCircleTier) {
    blackbirdInnerCircleTier = await prisma.artistSubscriptionTier.create({
      data: {
        name: "Inner Circle",
        description:
          "The full picture: process notes, early access, and honest updates",
        artistId: blackbird.id,
        minAmount: 1000,
        defaultAmount: 1000,
        currency: "usd",
      },
    });
    console.log(
      `Created Blackbird Inner Circle tier: ${blackbirdInnerCircleTier.id}`
    );
  }

  let crowSupporterTier = await prisma.artistSubscriptionTier.findFirst({
    where: { artistId: crow.id, name: "Crow Flock" },
  });
  if (!crowSupporterTier) {
    crowSupporterTier = await prisma.artistSubscriptionTier.create({
      data: {
        name: "Crow Flock",
        description: "Join the murder. Exclusive updates from Crow HQ.",
        artistId: crow.id,
        minAmount: 300,
        defaultAmount: 300,
        currency: "usd",
      },
    });
    console.log(`Created Crow Flock tier: ${crowSupporterTier.id}`);
  }

  const postSeeds = [
    // --- Blackbird posts ---
    {
      title: "Morning notes from the garden",
      urlSlug: "morning-notes-from-the-garden",
      artistId: blackbird.id,
      content: SHORT_CONTENT,
      isPublic: true,
      isDraft: false,
      publishedAt: new Date("2025-03-12T08:00:00Z"),
    },
    {
      title: "A year of watching birds: everything I noticed",
      urlSlug: "a-year-of-watching-birds",
      artistId: blackbird.id,
      content: LONG_CONTENT,
      isPublic: true,
      isDraft: false,
      publishedAt: new Date("2025-09-01T10:00:00Z"),
    },
    {
      title: "The honest numbers (subscribers only)",
      urlSlug: "the-honest-numbers",
      artistId: blackbird.id,
      content: SUBSCRIBER_CONTENT,
      isPublic: false,
      isDraft: false,
      publishedAt: new Date("2025-11-15T09:00:00Z"),
      minimumSubscriptionTierId: blackbirdSupporterTier.id,
    },
    {
      title: "Album update — inner circle only",
      urlSlug: "album-update-inner-circle",
      artistId: blackbird.id,
      content: TIER_EXCLUSIVE_CONTENT,
      isPublic: false,
      isDraft: false,
      publishedAt: new Date("2026-01-20T11:00:00Z"),
    },
    {
      title: "Untitled new piece (in progress)",
      urlSlug: "untitled-new-piece",
      artistId: blackbird.id,
      content: `<p>Not ready to share this yet but wanted to put some words down. Something about the relationship between repetition and discovery.</p><p>More soon.</p>`,
      isPublic: false,
      isDraft: true,
    },
    // --- Crow posts ---
    {
      title: "Why crows remember faces",
      urlSlug: "why-crows-remember-faces",
      artistId: crow.id,
      content: `<p>There's a crow that lives near the studio. I've been watching it for two years now, and I'm fairly sure it watches me back.</p><p>Crows can recognise individual human faces and hold grudges for years. There are documented cases of crows that have remembered and harassed specific people for over a decade. They pass this knowledge on to their offspring and other members of their group. If you wrong a crow, you don't just make an enemy — you potentially make enemies for generations.</p><p>I find this deeply reassuring for reasons I can't fully articulate.</p>`,
      isPublic: true,
      isDraft: false,
      publishedAt: new Date("2025-06-04T14:00:00Z"),
    },
    {
      title: "Studio diary: what the microphone picks up that you don't",
      urlSlug: "studio-diary-microphone",
      artistId: crow.id,
      content: `<p>A confession: most of what you're hearing on the new record isn't what I intended to record. The best sounds came from mistakes — a chair scraping, someone opening a door two floors up, the ventilation system that only kicks in at 2am when the building finally cools down.</p><p>I've started leaving the recorder running when I'm not playing. You'd be surprised what turns up.</p>`,
      isPublic: false,
      isDraft: false,
      publishedAt: new Date("2025-12-10T16:00:00Z"),
      minimumSubscriptionTierId: crowSupporterTier.id,
    },
    {
      title: "Draft: thoughts on silence",
      urlSlug: "draft-thoughts-on-silence",
      artistId: crow.id,
      content: `<p>Silence isn't the absence of sound. It's the presence of attention.</p>`,
      isPublic: false,
      isDraft: true,
    },
  ];

  for (const postData of postSeeds) {
    const existing = await prisma.post.findFirst({
      where: { urlSlug: postData.urlSlug, artistId: postData.artistId },
    });
    if (existing) {
      console.log(`Post "${postData.title}" already exists, skipping...`);
      continue;
    }

    const post = await prisma.post.create({ data: postData });
    console.log(`Created post: "${post.title}" (id: ${post.id})`);
  }

  // Post with featured image — Blackbird's long post gets a fake image record
  const longPost = await prisma.post.findFirst({
    where: { urlSlug: "a-year-of-watching-birds", artistId: blackbird.id },
  });
  if (longPost && !longPost.featuredImageId) {
    const imageId = randomUUID();
    await prisma.postImage.create({
      data: {
        id: imageId,
        mimeType: "image/jpeg",
        extension: "jpg",
        postId: longPost.id,
      },
    });
    await prisma.post.update({
      where: { id: longPost.id },
      data: { featuredImageId: imageId },
    });
    console.log(`Added featured image to post "${longPost.title}"`);
  }

  // Wire the inner-circle post to the specific tier via PostSubscriptionTier
  const innerCirclePost = await prisma.post.findFirst({
    where: { urlSlug: "album-update-inner-circle", artistId: blackbird.id },
  });
  if (innerCirclePost) {
    const existing = await prisma.postSubscriptionTier.findFirst({
      where: {
        postId: innerCirclePost.id,
        artistSubscriptionTierId: blackbirdInnerCircleTier.id,
      },
    });
    if (!existing) {
      await prisma.postSubscriptionTier.create({
        data: {
          postId: innerCirclePost.id,
          artistSubscriptionTierId: blackbirdInnerCircleTier.id,
        },
      });
      console.log(`Linked inner-circle post to Inner Circle tier`);
    }
  }

  console.log("Post seeding complete.");
}
