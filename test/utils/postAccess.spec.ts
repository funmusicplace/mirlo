import * as dotenv from "dotenv";
dotenv.config();

import assert from "node:assert";

import { describe, it } from "mocha";

import { canUserSeePostContent } from "../../src/utils/postAccess";

const subscriber = (profileSubscriptionTierId: number, amount: number) => ({
  profileSubscriptionTierId,
  amount,
});

describe("utils/postAccess", () => {
  describe("canUserSeePostContent", () => {
    it("lets anyone read a public post", () => {
      assert.equal(
        canUserSeePostContent(
          { isPublic: true },
          { isProfileOwner: false, subscriptions: [] }
        ),
        true
      );
    });

    it("lets the artist read their own subscriber-only post", () => {
      assert.equal(
        canUserSeePostContent(
          { isPublic: false },
          { isProfileOwner: true, subscriptions: [] }
        ),
        true
      );
    });

    it("keeps a subscriber-only post from someone with no subscription", () => {
      assert.equal(
        canUserSeePostContent(
          { isPublic: false },
          { isProfileOwner: false, subscriptions: [] }
        ),
        false
      );
    });

    describe("with a legacy minimum tier", () => {
      const post = {
        isPublic: false,
        minimumSubscriptionTier: { minAmount: 500 },
      };

      it("lets a subscriber paying at least the minimum read it", () => {
        assert.equal(
          canUserSeePostContent(post, {
            isProfileOwner: false,
            subscriptions: [subscriber(1, 500)],
          }),
          true
        );
      });

      it("keeps it from a subscriber paying less", () => {
        assert.equal(
          canUserSeePostContent(post, {
            isProfileOwner: false,
            subscriptions: [subscriber(1, 300)],
          }),
          false
        );
      });

      it("goes to every subscriber when there's no minimum at all", () => {
        assert.equal(
          canUserSeePostContent(
            { isPublic: false },
            { isProfileOwner: false, subscriptions: [subscriber(1, 0)] }
          ),
          true
        );
      });
    });

    // #1253
    describe("when the post is addressed to particular tiers", () => {
      const post = {
        isPublic: false,
        postSubscriptionTiers: [{ profileSubscriptionTierId: 2 }],
      };

      it("lets a subscriber on one of those tiers read it", () => {
        assert.equal(
          canUserSeePostContent(post, {
            isProfileOwner: false,
            subscriptions: [subscriber(2, 500)],
          }),
          true
        );
      });

      it("keeps it from a subscriber on a tier it wasn't addressed to", () => {
        assert.equal(
          canUserSeePostContent(post, {
            isProfileOwner: false,
            subscriptions: [subscriber(3, 5000)],
          }),
          false
        );
      });

      // Someone can hold a free follow alongside a paid tier; the post should
      // reach them if any one of those subscriptions was addressed.
      it("checks every subscription the reader holds, not just the dearest", () => {
        assert.equal(
          canUserSeePostContent(post, {
            isProfileOwner: false,
            subscriptions: [subscriber(3, 5000), subscriber(2, 0)],
          }),
          true
        );
      });

      it("ignores a leftover minimum tier the reader would have cleared", () => {
        assert.equal(
          canUserSeePostContent(
            { ...post, minimumSubscriptionTier: { minAmount: 0 } },
            {
              isProfileOwner: false,
              subscriptions: [subscriber(3, 5000)],
            }
          ),
          false
        );
      });
    });
  });
});
