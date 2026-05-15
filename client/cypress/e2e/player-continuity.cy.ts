import { ARTIST_EXAMPLE, TRACK_GROUP_EXAMPLE } from "../../../client/test/mocks";

const trackId = 1;
const artistSlug = "example-artist";

const track = {
  id: trackId,
  title: "Example Track",
  order: 1,
  trackGroupId: TRACK_GROUP_EXAMPLE.id,
  trackGroup: {
    ...TRACK_GROUP_EXAMPLE,
    artist: { ...TRACK_GROUP_EXAMPLE.artist },
  },
  isPreview: true,
  audio: {
    id: "audio-1",
    duration: 60,
    uploadState: "SUCCESS",
  },
  trackArtists: [],
  license: null,
};

describe("player continuity across navigation", () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        "nomadState",
        JSON.stringify({
          playerQueueIds: [trackId],
          currentlyPlayingIndex: 0,
        })
      );
    });

    cy.intercept("GET", "/auth/profile", {
      statusCode: 200,
      body: { result: null },
    });

    cy.intercept("GET", `/v1/tracks/${trackId}`, {
      statusCode: 200,
      body: { result: track },
    });

    cy.intercept("GET", `/v1/artists/${artistSlug}*`, {
      statusCode: 200,
      body: {
        result: {
          ...ARTIST_EXAMPLE,
          urlSlug: artistSlug,
          user: { artistLabels: [] },
        },
      },
    });

    cy.intercept("GET", "/v1/settings/instanceArtist", {
      statusCode: 200,
      body: { result: null },
    });

    cy.intercept("GET", "/v1/trackGroups*", {
      statusCode: 200,
      body: { results: [], total: 0 },
    });

    cy.intercept("GET", "/v1/tags*", {
      statusCode: 200,
      body: { results: [], total: 0 },
    });
  });

  it("keeps the Player mounted across route changes", () => {
    cy.visit("/");
    cy.get("#player", { timeout: 10000 })
      .invoke("attr", "data-mount-id")
      .as("originalMountId")
      .should("be.a", "string")
      .and("not.be.empty");

    cy.visit(`/${artistSlug}`);
    cy.get("@originalMountId").then((id) => {
      cy.get("#player").should("have.attr", "data-mount-id", id);
    });

    cy.visit("/");
    cy.get("@originalMountId").then((id) => {
      cy.get("#player").should("have.attr", "data-mount-id", id);
    });
  });
});
