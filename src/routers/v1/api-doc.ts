const apiDoc = {
  swagger: "2.0",
  basePath: "/",
  info: {
    title: "Nomad API",
    version: "1.0.0",
  },
  definitions: {
    TrackGroup: {
      type: "object",
      required: ["title"],
      properties: {
        string: {
          description: "Title of the trackGroup",
          type: "string",
        },
      },
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
    Artist: {
      type: "object",
      properties: {
        name: {
          description: "Name of the artist",
          type: "string",
        },
        bio: {
          description: "A little bit about the artist",
          type: ["string", "null"],
        },
        urlSlug: {
          description: "The string that will appear in the URL",
          type: "string",
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
      required: ["title"],
      properties: {
        string: {
          description: "Title of the track",
          type: "string",
        },
      },
    },
    ArtistSubscriptionTier: {
      type: "object",
      required: ["name", "description"],
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
      },
    },
  },
  paths: {},
};

export default apiDoc;
