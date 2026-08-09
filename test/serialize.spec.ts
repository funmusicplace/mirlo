import assert from "node:assert";

import { describe, it } from "mocha";

import { processSingleArtist } from "../src/serializers/artist";
import {
  renameProfileIdToArtistId,
  omitApPrivateKey,
} from "../src/serializers/utils";
import {
  serializeFundraiser,
  serializeFundraiserPledge,
} from "../src/serializers/fundraiser";
import { serializeMerch } from "../src/serializers/merch";
import { serializeNotification } from "../src/serializers/notification";
import { serializePost } from "../src/serializers/post";
import { serializeMerchPurchase } from "../src/serializers/merchPurchase";
import { serializeProfileSubscriptionTier } from "../src/serializers/profileSubscriptionTier";
import { serializeUserProfileTip } from "../src/serializers/userProfileTip";
import { processSingleTrack } from "../src/serializers/track";
import { processSingleTrackGroup } from "../src/serializers/trackGroup";
import { serializeUserTransaction } from "../src/serializers/userTransaction";
import { serializeUser } from "../src/serializers/user";
import {
  serializeProfileUserSubscription,
  serializeProfileUserSubscriptionCharge,
} from "../src/serializers/profileUserSubscription";

/**
 * Recursively walk a serialized payload and collect the dotted paths of any key
 * that should never cross the wire: the raw private key, and any Prisma-side
 * `profile*` / `profiles` ownership key that a serializer is meant to rename to
 * `artist*` / `artists`.
 */
const collectLeaks = (value: unknown, path = "$"): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectLeaks(item, `${path}[${index}]`)
    );
  }
  if (value && typeof value === "object") {
    const leaks: string[] = [];
    for (const [key, nested] of Object.entries(value)) {
      if (
        key === "apPrivateKey" ||
        key === "profiles" ||
        key === "profile" ||
        key.startsWith("profile")
      ) {
        leaks.push(`${path}.${key}`);
      }
      leaks.push(...collectLeaks(nested, `${path}.${key}`));
    }
    return leaks;
  }
  return [];
};

const assertNoLeaks = (value: unknown, label: string) => {
  const leaks = collectLeaks(value);
  assert.deepEqual(
    leaks,
    [],
    `${label} leaked profile/private keys at: ${leaks.join(", ")}`
  );
};

/**
 * Internal field names → public wire names for an in-progress rename.
 * Empty when no remapping is in flight; add entries during migrations so
 * assertPreservedKeys expects the new name on the wire.
 */
const INTERNAL_RENAMED_FIELDS: Record<string, string> = {
  profile: "artist",
  profileId: "artistId",
  profiles: "artists",
  profileSubscriptionTier: "artistSubscriptionTier",
  profileSubscriptionTierId: "artistSubscriptionTierId",
  profileUserSubscription: "artistUserSubscription",
  profileUserSubscriptions: "artistUserSubscriptions",
  profileUserSubscriptionId: "artistUserSubscriptionId",
  profileUserSubscriptionCharges: "artistUserSubscriptionCharges",
  profileTipTier: "artistTipTier",
  profileTipTierId: "artistTipTierId",
};

/** Keys intentionally omitted at any depth (not expected on the wire). */
const DEFAULT_OMITTED_FIELDS = ["apPrivateKey", "_count"];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Recursively assert input keys survive serialization: remapped via
 * INTERNAL_RENAMED_FIELDS when listed, otherwise under the same name.
 * Use `omit` for fields intentionally dropped (merged with defaults).
 */
const assertPreservedKeys = (
  input: unknown,
  output: unknown,
  label: string,
  options?: { omit?: string[] }
) => {
  const omit = new Set([...DEFAULT_OMITTED_FIELDS, ...(options?.omit ?? [])]);
  const missing: string[] = [];

  const walk = (inVal: unknown, outVal: unknown, path: string) => {
    if (Array.isArray(inVal)) {
      if (!Array.isArray(outVal)) {
        missing.push(path || "$");
        return;
      }
      inVal.forEach((item, index) => {
        walk(item, outVal[index], `${path}[${index}]`);
      });
      return;
    }
    if (!isPlainObject(inVal)) {
      return;
    }
    if (!isPlainObject(outVal)) {
      missing.push(path || "$");
      return;
    }
    for (const key of Object.keys(inVal)) {
      if (omit.has(key)) continue;
      const outKey = INTERNAL_RENAMED_FIELDS[key] ?? key;
      const childPath = path ? `${path}.${outKey}` : outKey;
      if (!(outKey in outVal)) {
        missing.push(
          outKey === key
            ? childPath
            : `${path ? `${path}.` : ""}${key} → ${outKey}`
        );
        continue;
      }
      walk(inVal[key], outVal[outKey], childPath);
    }
  };

  walk(input, output, "");
  assert.deepEqual(
    missing,
    [],
    `${label} dropped fields: ${missing.join(", ")}`
  );
};

const artistFixture = (
  id: number,
  overrides: Record<string, unknown> = {}
) => ({
  id,
  name: `Artist ${id}`,
  urlSlug: `artist-${id}`,
  apPrivateKey: "SUPER-SECRET",
  apPublicKey: "public-key",
  ...overrides,
});

describe("outbound serializers", () => {
  describe("omitApPrivateKey / renameProfileIdToArtistId", () => {
    it("removes private profile data from artist references", () => {
      const artist = omitApPrivateKey(artistFixture(1));

      assert.equal("apPrivateKey" in artist, false);
      assert.equal(artist.apPublicKey, "public-key");
    });

    it("renames profileId to artistId and preserves other fields", () => {
      const input = {
        id: "avatar",
        profileId: 4,
        url: ["a", "b"],
      };
      const result = renameProfileIdToArtistId(input);

      assert.deepEqual(result, {
        id: "avatar",
        url: ["a", "b"],
        artistId: 4,
      });
      assertPreservedKeys(input, result, "renameProfileIdToArtistId");
    });

    it("passes through null/undefined values untouched", () => {
      assert.equal(renameProfileIdToArtistId(null), null);
      assert.equal(renameProfileIdToArtistId(undefined), undefined);
    });

    it("omits artistId when there is no profileId", () => {
      const result = renameProfileIdToArtistId({ id: "avatar", url: [] });
      assert.equal("artistId" in (result as object), false);
    });
  });

  describe("serializeUser", () => {
    it("renames profiles to sanitized artists", () => {
      const input = {
        id: 2,
        email: "a@b.co",
        profiles: [artistFixture(4)],
      };
      const user = serializeUser(input);

      assert.equal("profiles" in user, false);
      assert.equal(user.artists?.length, 1);
      assertPreservedKeys(input, user, "serializeUser");
      assertNoLeaks(user, "serializeUser");
    });

    it("leaves users without profiles unchanged", () => {
      const user = serializeUser({ id: 2, email: "a@b.co" });
      assert.equal("artists" in user, false);
    });

    it("deeply serializes artists, favorites and subscriptions when present", () => {
      const input = {
        id: 2,
        email: "a@b.co",
        profiles: [artistFixture(4)],
        userAvatar: null,
        userBanner: null,
        trackFavorites: [
          {
            trackId: 1,
            track: {
              id: 1,
              trackGroup: {
                id: 7,
                profileId: 4,
                profile: artistFixture(4),
                cover: null,
              },
            },
          },
        ],
        profileUserSubscriptions: [
          {
            id: 3,
            profileSubscriptionTierId: 5,
            profileSubscriptionTier: {
              id: 5,
              profileId: 4,
              profile: { ...artistFixture(4), avatar: null },
            },
          },
        ],
      };
      const user = serializeUser(input);

      assert.equal("profiles" in user, false);
      assert.equal((user.artists as unknown[]).length, 1);
      assertPreservedKeys(input, user, "serializeUser");
      assertNoLeaks(user, "serializeUser");
    });
  });

  describe("serializeUserProfileTip", () => {
    it("renames owner fields and strips the private key", () => {
      const input = {
        id: "tip-1",
        amount: 500,
        profileId: 4,
        profile: artistFixture(4),
        profileTipTierId: 9,
      };
      const tip = serializeUserProfileTip(input);

      assert.equal(tip.artistId, 4);
      assert.equal(tip.artistTipTierId, 9);
      assertPreservedKeys(input, tip, "serializeUserProfileTip");
      assertNoLeaks(tip, "serializeUserProfileTip");
    });

    it("keeps a null owner without inventing an artist object", () => {
      const tip = serializeUserProfileTip({
        id: "tip-2",
        profileId: null,
        profile: null,
      });
      assert.equal(tip.artistId, null);
      assert.equal(tip.artist, null);
    });
  });

  describe("serializeMerch", () => {
    it("deeply serializes merch owner and includePurchaseTrackGroup", () => {
      const input = {
        id: "merch",
        title: "Shirt",
        profileId: 4,
        profile: {
          ...artistFixture(4),
          user: { currency: "eur" },
        },
        includePurchaseTrackGroup: {
          id: 7,
          profileId: 4,
          profile: artistFixture(4),
        },
      };
      const merch = serializeMerch(input);

      assert.equal(merch.artistId, 4);
      assert.equal(merch.currency, "eur");
      const include = merch.includePurchaseTrackGroup as Record<
        string,
        unknown
      >;
      assert.equal(include.artistId, 4);
      assertPreservedKeys(input, merch, "serializeMerch");
      assertNoLeaks(merch, "serializeMerch");
    });
  });

  describe("serializeMerchPurchase", () => {
    it("serializes the nested merch of a purchase", () => {
      const input = {
        id: "purchase-1",
        merch: {
          id: "merch",
          profileId: 4,
          profile: artistFixture(4),
        },
      };
      const purchase = serializeMerchPurchase(input);

      assert.equal((purchase.merch as Record<string, unknown>).artistId, 4);
      assertPreservedKeys(input, purchase, "serializeMerchPurchase");
      assertNoLeaks(purchase, "serializeMerchPurchase");
    });

    it("tolerates a null merch relation", () => {
      const purchase = serializeMerchPurchase({ id: "p", merch: null });
      assert.equal(purchase.merch, null);
    });
  });

  describe("serializeProfileSubscriptionTier", () => {
    it("renames tier and nested release owners", () => {
      const input = {
        id: 5,
        name: "Gold",
        profileId: 4,
        profile: artistFixture(4),
        releases: [
          {
            trackGroup: {
              id: 7,
              title: "Album",
              profileId: 4,
              profile: artistFixture(4),
            },
          },
        ],
      };
      const tier = serializeProfileSubscriptionTier(input);

      assert.equal(tier.artistId, 4);
      const release = (tier.releases as Record<string, unknown>[])[0];
      const releaseTg = release.trackGroup as Record<string, unknown>;
      assert.equal(releaseTg.artistId, 4);
      assertPreservedKeys(input, tier, "serializeProfileSubscriptionTier", {
        // Tier serializer intentionally drops nested profile (parent is the artist).
        omit: ["profile"],
      });
      assertNoLeaks(tier, "serializeProfileSubscriptionTier");
    });
  });

  describe("serializeProfileUserSubscription", () => {
    it("deeply serializes tier, artist and charges", () => {
      const input = {
        id: 3,
        profileSubscriptionTierId: 5,
        profileSubscriptionTier: {
          id: 5,
          profileId: 4,
          profile: artistFixture(4, {
            avatar: { id: "av", profileId: 4, url: ["a"] },
          }),
        },
        profileUserSubscriptionCharges: [
          { id: "charge-1", profileUserSubscriptionId: 3 },
        ],
      };
      const subscription = serializeProfileUserSubscription(input);

      assert.equal("profileSubscriptionTier" in subscription, false);
      assert.equal(subscription.artistSubscriptionTierId, 5);
      const tier = subscription.artistSubscriptionTier as Record<
        string,
        unknown
      >;
      assert.equal(tier.artistId, 4);
      const artist = tier.artist as Record<string, unknown>;
      const avatar = artist.avatar as Record<string, unknown>;
      assert.equal(avatar.artistId, 4);
      assert.equal("profileId" in avatar, false);
      const charges = subscription.artistUserSubscriptionCharges as Record<
        string,
        unknown
      >[];
      assert.equal(charges[0].artistUserSubscriptionId, 3);
      assertPreservedKeys(
        input,
        subscription,
        "serializeProfileUserSubscription"
      );
      assertNoLeaks(subscription, "serializeProfileUserSubscription");
    });

    it("can omit the tier artist when requested", () => {
      const subscription = serializeProfileUserSubscription(
        {
          id: 3,
          profileSubscriptionTierId: 5,
          profileSubscriptionTier: {
            id: 5,
            profileId: 4,
            profile: artistFixture(4),
          },
        },
        { includeTierArtist: false }
      );
      const tier = subscription.artistSubscriptionTier as Record<
        string,
        unknown
      >;
      assert.equal("artist" in tier, false);
    });
  });

  describe("serializeProfileUserSubscriptionCharge", () => {
    it("serializes the nested subscription and tier", () => {
      const input = {
        id: "charge-1",
        profileUserSubscriptionId: 3,
        profileUserSubscription: {
          id: 3,
          profileSubscriptionTierId: 5,
          profileSubscriptionTier: {
            id: 5,
            profileId: 4,
            profile: artistFixture(4),
          },
        },
      };
      const charge = serializeProfileUserSubscriptionCharge(input);

      assert.equal(charge.artistUserSubscriptionId, 3);
      const sub = charge.artistUserSubscription as Record<string, unknown>;
      assert.equal(sub.artistSubscriptionTierId, 5);
      assertPreservedKeys(
        input,
        charge,
        "serializeProfileUserSubscriptionCharge"
      );
      assertNoLeaks(charge, "serializeProfileUserSubscriptionCharge");
    });
  });

  describe("processSingleTrackGroup", () => {
    it("deeply serializes owner, tracks, merch and tags", () => {
      const input = {
        id: 7,
        title: "Album",
        profileId: 4,
        notifiedFollowersAt: null,
        profile: {
          ...artistFixture(4),
          user: { currency: "gbp" },
        },
        tracks: [{ id: 1, isPreview: false, userTrackPurchases: [] }] as never,
        trackGroupPurchases: [],
        merch: [
          {
            id: "merch",
            profileId: 4,
            profile: artistFixture(4),
          },
        ] as never,
        tags: [{ tag: { tag: "rock" } }] as never,
      };
      const trackGroup = processSingleTrackGroup(
        input as unknown as Parameters<typeof processSingleTrackGroup>[0]
      );

      assert.equal(trackGroup.artistId, 4);
      assert.equal(trackGroup.currency, "gbp");
      assert.deepEqual(trackGroup.tags, ["rock"]);
      const merch = (trackGroup.merch as Record<string, unknown>[])[0];
      assert.equal(merch.artistId, 4);
      assertPreservedKeys(input, trackGroup, "processSingleTrackGroup", {
        // tags are flattened to string[]; trackGroupPurchases is only used for playability.
        omit: ["tags", "trackGroupPurchases"],
      });
      assertNoLeaks(trackGroup, "processSingleTrackGroup");
    });

    it("strips apPrivateKey when owner arrives as artist instead of profile", () => {
      const trackGroup = processSingleTrackGroup({
        id: 7,
        title: "Album",
        notifiedFollowersAt: null,
        artist: artistFixture(4),
      } as unknown as Parameters<typeof processSingleTrackGroup>[0]);

      assert.equal(trackGroup.artistId, 4);
      assert.equal("profile" in trackGroup, false);
      assert.ok(trackGroup.artist);
      assertNoLeaks(trackGroup, "processSingleTrackGroup artist-shaped owner");
    });
  });

  describe("processSingleTrack", () => {
    it("serializes the nested track group owner", () => {
      const input = {
        id: 1,
        isPreview: false,
        userTrackPurchases: [],
        trackGroup: {
          id: 7,
          title: "Album",
          profileId: 4,
          notifiedFollowersAt: null,
          userTrackGroupPurchases: [],
          profile: artistFixture(4),
        },
      };
      const track = processSingleTrack(
        input as unknown as Parameters<typeof processSingleTrack>[0]
      );

      const tg = track.trackGroup as Record<string, unknown>;
      assert.equal(tg?.artistId, 4);
      assertPreservedKeys(input, track, "processSingleTrack", {
        omit: ["userTrackPurchases", "userTrackGroupPurchases"],
      });
      assertNoLeaks(track, "processSingleTrack");
    });
  });

  describe("serializePost", () => {
    it("serializes owner and hides content from non-subscribers", () => {
      const input = {
        id: 10,
        isPublic: false,
        content: "<p>Secret</p><p>More</p>",
        profileId: 4,
        profile: artistFixture(4),
      };
      const post = serializePost(input);

      assert.equal(post.artistId, 4);
      assert.equal(post.isContentHidden, true);
      assert.equal(post.content, "<p>Secret</p>");
      assertPreservedKeys(input, post, "serializePost");
      assertNoLeaks(post, "serializePost");
    });

    it("reveals content for subscribers", () => {
      const post = serializePost(
        {
          id: 10,
          isPublic: false,
          content: "<p>Secret</p><p>More</p>",
          profileId: 4,
          profile: artistFixture(4),
        },
        undefined,
        undefined,
        true
      );
      assert.equal(post.isContentHidden, false);
      assert.equal(post.content, "<p>Secret</p><p>More</p>");
    });
  });

  describe("processSingleArtist", () => {
    it("deeply serializes labels, posts, merch, trackGroups and tiers", () => {
      const input = {
        ...artistFixture(4),
        userId: 100,
        linksJson: [],
        user: { id: 100, currency: "usd" },
        posts: [
          {
            id: 10,
            isPublic: true,
            content: "<p>Hi</p>",
            profileId: 4,
          },
        ] as never,
        merch: [
          { id: "merch", profileId: 4, profile: artistFixture(4) },
        ] as never,
        trackGroups: [
          {
            id: 7,
            title: "Album",
            profileId: 4,
            notifiedFollowersAt: null,
            profile: artistFixture(4),
          },
        ] as never,
        subscriptionTiers: [{ id: 5, name: "Gold", profileId: 4 }] as never,
        artistLabels: [
          {
            artistId: 4,
            labelUserId: 200,
            artist: artistFixture(4),
            labelUser: {
              id: 200,
              profiles: [artistFixture(11)],
            },
          },
        ] as never,
      };
      const artist = processSingleArtist(
        input as unknown as Parameters<typeof processSingleArtist>[0],
        100
      );

      assert.equal("apPrivateKey" in artist, false);
      const labels = artist.artistLabels as Record<string, unknown>[];
      const labelUser = labels[0].labelUser as Record<string, unknown>;
      assert.equal("profiles" in labelUser, false);
      assert.equal((labelUser.artists as unknown[]).length, 1);
      assertPreservedKeys(input, artist, "processSingleArtist");
      assertNoLeaks(artist, "processSingleArtist");
    });
  });

  describe("serializeFundraiser / serializeFundraiserPledge", () => {
    it("serializes nested fundraiser track groups", () => {
      const input = {
        id: "fund-1",
        trackGroups: [
          {
            id: 7,
            title: "Album",
            profileId: 4,
            notifiedFollowersAt: null,
            profile: artistFixture(4),
          },
        ] as never,
      };
      const fundraiser = serializeFundraiser(input);

      const tg = (fundraiser.trackGroups as Record<string, unknown>[])[0];
      assert.equal(tg.artistId, 4);
      assertPreservedKeys(input, fundraiser, "serializeFundraiser");
      assertNoLeaks(fundraiser, "serializeFundraiser");
    });

    it("serializes the fundraiser nested in a pledge", () => {
      const input = {
        id: "pledge-1",
        fundraiser: {
          id: "fund-1",
          trackGroups: [
            {
              id: 7,
              title: "Album",
              profileId: 4,
              notifiedFollowersAt: null,
              profile: artistFixture(4),
            },
          ] as never,
        },
      };
      const pledge = serializeFundraiserPledge(input);

      assertPreservedKeys(input, pledge, "serializeFundraiserPledge");
      assertNoLeaks(pledge, "serializeFundraiserPledge");
    });

    it("tolerates a null fundraiser", () => {
      const pledge = serializeFundraiserPledge({ id: "p", fundraiser: null });
      assert.equal(pledge.fundraiser, null);
    });
  });

  describe("serializeNotification", () => {
    it("deeply serializes subscription, post, trackGroup and relatedUser", () => {
      const input = {
        id: "notif-1",
        profileId: 4,
        profile: artistFixture(4),
        relatedUserId: 100,
        trackGroupId: 7,
        subscription: {
          id: 3,
          profileSubscriptionTierId: 5,
          profileSubscriptionTier: {
            id: 5,
            profileId: 4,
            profile: artistFixture(4),
          },
        },
        post: {
          id: 10,
          profileId: 4,
          profile: { ...artistFixture(4), avatar: { url: [] } },
        },
        trackGroup: {
          id: 7,
          profileId: 4,
          profile: { ...artistFixture(4), user: { currency: "cad" } },
          cover: { url: [] },
          purchase: { id: "purchase-1" },
        },
        relatedUser: {
          id: 100,
          profiles: [{ ...artistFixture(11), avatar: { url: [] } }],
        },
      };
      const notification = serializeNotification(input);

      assert.equal(notification.artistId, 4);
      const subscription = notification.subscription as Record<string, unknown>;
      assert.equal(subscription.artistSubscriptionTierId, 5);
      const relatedUser = notification.relatedUser as Record<string, unknown>;
      assert.equal((relatedUser.artists as unknown[]).length, 1);
      const trackGroup = notification.trackGroup as Record<string, unknown>;
      assert.deepEqual(trackGroup.purchase, { id: "purchase-1" });
      assertPreservedKeys(input, notification, "serializeNotification");
      assertNoLeaks(notification, "serializeNotification");
    });
  });

  describe("serializeUserTransaction", () => {
    it("deeply serializes purchases, tips and subscription charges", () => {
      const input = {
        id: "transaction",
        trackGroupPurchases: [
          {
            trackGroup: { id: 7, profileId: 4, profile: artistFixture(4) },
          },
        ],
        trackPurchases: [
          {
            track: {
              id: 1,
              trackGroup: { id: 8, profileId: 4, profile: artistFixture(4) },
            },
          },
        ],
        merchPurchases: [
          {
            merch: {
              id: "merch",
              profileId: 4,
              profile: artistFixture(4),
              includePurchaseTrackGroup: {
                id: 7,
                profileId: 4,
                profile: artistFixture(4),
              },
            },
          },
        ],
        tips: [
          {
            id: "tip",
            profileId: 4,
            profile: artistFixture(4),
            profileTipTierId: 9,
          },
        ],
        profileUserSubscriptionCharges: [{ id: "charge" }],
      };
      const result = serializeUserTransaction(input);

      const trackGroup = (
        result.trackGroupPurchases as { trackGroup: Record<string, unknown> }[]
      )[0].trackGroup;
      assert.equal(trackGroup.artistId, 4);
      const tip = (result.tips as Record<string, unknown>[])[0];
      assert.equal(tip.artistTipTierId, 9);
      assert.equal("artistUserSubscriptionCharges" in result, true);
      assertPreservedKeys(input, result, "serializeUserTransaction");
      assertNoLeaks(result, "serializeUserTransaction");
    });

    it("emits email shape without artistId scalars", () => {
      const result = serializeUserTransaction(
        {
          id: "transaction",
          tips: [{ id: "tip", profileId: 4, profile: artistFixture(4) }],
        },
        { emailShape: true }
      );

      const tip = (result.tips as Record<string, unknown>[])[0];
      assert.equal("artistId" in tip, false);
      assert.ok(tip.artist);
      assertNoLeaks(result, "serializeUserTransaction email shape");
    });
  });
});
