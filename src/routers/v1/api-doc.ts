const apiDoc = {
  swagger: "2.0",
  basePath: "/",
  info: {
    title: "Mirlo API",
    version: "1.0.0",
  },
  definitions: {
    TrackGroup: {
      type: "object",
      required: [],
      properties: {
        id: { type: "number" },
        title: { type: "string" },
        urlSlug: { type: "string" },
        artistId: { type: "number" },
        minPrice: {
          type: ["number", "null"],
          description: "Minimum price in cents",
        },
        currency: { type: ["string", "null"] },
        publishedAt: { type: ["string", "null"], format: "date-time" },
        about: { type: ["string", "null"] },
        coverImageAlt: { type: ["string", "null"] },
      },
    },
    Fundraiser: {
      type: "object",
      required: [],
      properties: {
        string: {
          description: "Name of the fundraiser",
          type: "string",
        },
      },
    },
    Merch: {
      type: "object",
      required: [],
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        urlSlug: { type: ["string", "null"] },
        artistId: { type: "number" },
        description: { type: ["string", "null"] },
        minPrice: {
          type: ["number", "null"],
          description: "Minimum price in cents",
        },
        currency: { type: ["string", "null"] },
        isPublic: { type: "boolean" },
      },
    },
    MerchPurchase: {
      type: "object",
      required: [],
    },
    TrackGroupPurchase: {
      type: "object",
      required: ["userId", "trackGroupId"],
      properties: {
        userId: {
          description: "ID of the user who bought the album",
          type: "number",
        },
        trackGroupId: {
          description: "ID of the trackGroup",
          type: "number",
        },
      },
    },
    Profile: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        bio: { type: ["string", "null"] },
        urlSlug: {
          type: "string",
          description: "Used in URLs and as lookup key",
        },
        userId: { type: "number" },
        trackGroups: {
          type: "array",
          description: "Published releases",
          items: { $ref: "#/definitions/TrackGroup" },
        },
        merch: {
          type: "array",
          description: "Public merch items",
          items: { $ref: "#/definitions/Merch" },
        },
        subscriptionTiers: {
          type: "array",
          description: "Available subscription tiers",
          items: { $ref: "#/definitions/ProfileSubscriptionTierResult" },
        },
      },
    },
    PurchaseRequest: {
      type: "object",
      required: ["artistId", "items"],
      properties: {
        readerId: {
          type: "string",
          description:
            "Stripe Terminal reader ID (tmr_*). Provide to dispatch to a physical reader; omit for an online PaymentIntent.",
        },
        artistId: {
          type: "number",
          description:
            "ID of the artist whose connected account will receive payment",
        },
        email: {
          type: "string",
          description:
            "Buyer email — used when no logged-in session is present",
        },
        hosted: {
          type: "boolean",
          description:
            "When true, an online paid purchase returns a `redirectUrl` to Mirlo's " +
            "hosted checkout page instead of a `clientSecret`. Lets external API " +
            "consumers complete payment with a single redirect.",
        },
        successUrl: {
          type: "string",
          description:
            "Where the hosted checkout page sends the buyer after payment. Must " +
            "share an origin with the calling client's registered application URL " +
            "or allowed CORS origins. Defaults to Mirlo's post-purchase page.",
        },
        items: {
          type: "array",
          description:
            "Items to purchase. Mix merch/trackGroup/tip freely for terminal. " +
            "Online currently supports a single trackGroup item; other types coming soon. " +
            "Subscription must be the only item.",
          items: {
            type: "object",
            required: ["type"],
            properties: {
              type: {
                type: "string",
                enum: ["trackGroup", "merch", "tip", "subscription"],
              },
              id: {
                type: ["number", "string"],
                description:
                  "trackGroup ID as a number (trackGroup items) or merch ID as a UUID string (merch items)",
              },
              tierId: {
                type: "number",
                description: "Subscription tier ID (subscription items only)",
              },
              price: {
                type: "string",
                description:
                  "Price in cents — online trackGroup only; allows pay-what-you-want above the minimum",
              },
              quantity: {
                type: "number",
                description: "Quantity (merch only)",
              },
              amount: {
                type: "number",
                description:
                  "Amount in cents — tip items (required) or subscription items (overrides tier default)",
              },
              message: {
                type: "string",
                description: "Optional message to the artist",
              },
            },
          },
        },
      },
    },
    User: {
      type: "object",
      required: ["name"],
      properties: {
        string: {
          description: "Name of the artist",
          type: "string",
        },
      },
    },
    Post: {
      type: "object",
      required: ["title"],
      properties: {
        string: {
          description: "Title of the post",
          type: "string",
        },
      },
    },
    Track: {
      type: "object",
      required: [],
      properties: {
        string: {
          description: "Title of the track",
          type: "string",
        },
      },
    },
    ProfileSubscriptionTierResult: {
      type: "object",
      properties: {
        name: {
          description: "name of the subscription",
          type: "string",
        },
        description: {
          description: "description of the subscription",
          type: "string",
        },
        minAmount: {
          description: "minimum amount of the subscription",
          type: "number",
        },
        digitalDiscountPercent: {
          description:
            "discount percentage applied for subscribers on digital purchases",
          type: "number",
        },
        merchDiscountPercent: {
          description:
            "discount percentage applied for subscribers on merch purchases",
          type: "number",
        },
      },
    },
    ProfileSubscriptionTierCreate: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          description: "name of the subscription",
          type: "string",
        },
        description: {
          description: "description of the subscription",
          type: "string",
        },
        minAmount: {
          description: "minimum amount of the subscription",
          type: "number",
        },
        digitalDiscountPercent: {
          description:
            "discount percentage applied for subscribers on digital purchases",
          type: "number",
        },
        merchDiscountPercent: {
          description:
            "discount percentage applied for subscribers on merch purchases",
          type: "number",
        },
      },
    },
    ProfileSubscriptionTierUpdate: {
      type: "object",
      properties: {
        name: {
          description: "name of the subscription",
          type: "string",
        },
        description: {
          description: "description of the subscription",
          type: "string",
        },
        minAmount: {
          description: "minimum amount of the subscription",
          type: "number",
        },
        digitalDiscountPercent: {
          description:
            "discount percentage applied for subscribers on digital purchases",
          type: "number",
        },
        merchDiscountPercent: {
          description:
            "discount percentage applied for subscribers on merch purchases",
          type: "number",
        },
      },
    },
  },
  paths: {},
};

export default apiDoc;
