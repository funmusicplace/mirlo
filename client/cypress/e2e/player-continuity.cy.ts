import {
  ARTIST_EXAMPLE,
  TRACK_GROUP_EXAMPLE,
} from "../../../client/test/mocks";

const trackId = 1;
const artistSlug = "example-artist";

const artist = {
  ...ARTIST_EXAMPLE,
  urlSlug: artistSlug,
  user: { artistLabels: [] },
};

const featuredRelease = {
  ...TRACK_GROUP_EXAMPLE,
  artist: { ...TRACK_GROUP_EXAMPLE.artist, urlSlug: artistSlug },
};

const track = {
  id: trackId,
  title: "Example Track",
  order: 1,
  trackGroupId: TRACK_GROUP_EXAMPLE.id,
  trackGroup: featuredRelease,
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
    cy.intercept("GET", "/auth/user", {
      statusCode: 200,
      body: { result: null },
    });

    cy.intercept("GET", `/v1/tracks/${trackId}`, {
      statusCode: 200,
      body: { result: track },
    });

    cy.intercept("GET", `/v1/artists/${artistSlug}*`, {
      statusCode: 200,
      body: { result: artist },
    });

    cy.intercept("GET", "/v1/settings/instanceArtist", {
      statusCode: 200,
      body: { result: null },
    });

    cy.intercept("GET", "/v1/trackGroups*", {
      statusCode: 200,
      body: { results: [featuredRelease], total: 1 },
    });

    cy.intercept("GET", "/v1/trackGroups/topSold*", {
      statusCode: 200,
      body: { results: [], total: 0 },
    });

    cy.intercept("GET", "/v1/tags*", {
      statusCode: 200,
      body: { results: [], total: 0 },
    });

    cy.intercept("GET", "/v1/posts*", {
      statusCode: 200,
      body: { results: [], total: 0 },
    });
  });

  it("keeps the Player mounted across client-side navigation", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "nomadState",
          JSON.stringify({
            playerQueueIds: [trackId],
            currentlyPlayingIndex: 0,
          })
        );
      },
    });

    cy.get("#player", { timeout: 10000 })
      .invoke("attr", "data-mount-id")
      .as("originalMountId")
      .should("be.a", "string")
      .and("not.be.empty");

    cy.get(`a[href="/${artistSlug}"]`).first().click();
    cy.url().should("include", `/${artistSlug}`);

    cy.get("@originalMountId").then((id) => {
      cy.get("#player").should("have.attr", "data-mount-id", id);
    });

    cy.get('a[aria-label="Mirlo"]').first().click();
    cy.url().should("not.include", `/${artistSlug}`);

    cy.get("@originalMountId").then((id) => {
      cy.get("#player").should("have.attr", "data-mount-id", id);
    });
  });
});
