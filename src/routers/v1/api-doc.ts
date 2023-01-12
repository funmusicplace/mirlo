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
    Artist: {
      type: "object",
      required: ["name"],
      properties: {
        string: {
          description: "Name of the artist",
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
  },
  paths: {},
};

export default apiDoc;
