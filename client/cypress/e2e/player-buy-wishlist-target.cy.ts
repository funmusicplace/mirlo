import {
  ARTIST_EXAMPLE,
  TRACK_GROUP_EXAMPLE,
} from "../../../client/test/mocks";

const artistSlug = "example-artist";
const albumSlug = TRACK_GROUP_EXAMPLE.urlSlug ?? "example-album";

const artist = {
  ...ARTIST_EXAMPLE,
  urlSlug: artistSlug,
  user: { artistLabels: [], currency: "usd" },
};

const featuredRelease = {
  ...TRACK_GROUP_EXAMPLE,
  artist: { ...TRACK_GROUP_EXAMPLE.artist, urlSlug: artistSlug },
};

const buildTrack = ({
  id,
  trackCount,
}: {
  id: number;
  trackCount: number;
}) => ({
  id,
  title: `Track ${id}`,
  order: 1,
  trackGroupId: featuredRelease.id,
  trackGroup: {
    ...featuredRelease,
    tracksCount: trackCount,
  },
  isPreview: true,
  audio: { id: `audio-${id}`, duration: 60, uploadState: "SUCCESS" },
  trackArtists: [],
  license: null,
});

const baseUser = {
  id: 1,
  email: "tester@example.com",
  name: "Tester",
  wishlist: [],
  trackFavorites: [],
  userTrackGroupPurchases: [],
  userTrackPurchases: [],
};

const stubCommonRoutes = () => {
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
  cy.intercept("GET", `/v1/artists/${artistSlug}*`, {
    statusCode: 200,
    body: { result: artist },
  });
  cy.intercept("GET", `/v1/trackGroups/${albumSlug}*`, {
    statusCode: 200,
    body: { result: featuredRelease },
  });
};

const visitWithTrack = (trackId: number) => {
  cy.visit("/", {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        "nomadState",
        JSON.stringify({
          playerQueueIds: [trackId],
          currentlyPlayingIndex: 0,
          playing: true,
        })
      );
    },
  });
};

describe("player wishlist/buy target choice", () => {
  describe("multi-track release", () => {
    const trackId = 42;

    beforeEach(() => {
      stubCommonRoutes();

      cy.intercept("GET", "/auth/profile", {
        statusCode: 200,
        body: { result: baseUser },
      });

      cy.intercept("GET", `/v1/tracks/${trackId}`, {
        statusCode: 200,
        body: { result: buildTrack({ id: trackId, trackCount: 8 }) },
      });

      cy.intercept("POST", `/v1/tracks/${trackId}/favorite`, {
        statusCode: 200,
        body: { result: {} },
      }).as("favoriteTrack");

      cy.intercept("POST", `/v1/trackGroups/${featuredRelease.id}/wishlist`, {
        statusCode: 200,
        body: { result: {} },
      }).as("wishlistAlbum");
    });

    it("wishlist trigger opens a 2-item dropdown that targets the track", () => {
      visitWithTrack(trackId);

      cy.get('[data-cy="player-actions"] button.wishlist', {
        timeout: 10000,
      }).click();

      cy.contains("Wishlist this track").should("be.visible");
      cy.contains("Wishlist this album").should("be.visible");

      cy.contains("Wishlist this track").click();

      cy.wait("@favoriteTrack")
        .its("request.body")
        .should("deep.equal", { favorite: true });
    });

    it("wishlist dropdown targets the album when album item is picked", () => {
      visitWithTrack(trackId);

      cy.get('[data-cy="player-actions"] button.wishlist', {
        timeout: 10000,
      }).click();
      cy.contains("Wishlist this album").click();

      cy.wait("@wishlistAlbum")
        .its("request.body")
        .should("deep.equal", { wishlist: true });
    });

    it("buy trigger opens a 2-item dropdown with track and album options", () => {
      visitWithTrack(trackId);

      cy.get('[data-cy="player-actions"]', { timeout: 10000 })
        .contains("button", "Name your price")
        .click();

      cy.contains("Buy this track").should("be.visible");
      cy.contains("Buy this album").should("be.visible");
    });
  });

  describe("single-track release", () => {
    const trackId = 7;

    beforeEach(() => {
      stubCommonRoutes();

      cy.intercept("GET", "/auth/profile", {
        statusCode: 200,
        body: { result: baseUser },
      });

      cy.intercept("GET", `/v1/tracks/${trackId}`, {
        statusCode: 200,
        body: { result: buildTrack({ id: trackId, trackCount: 1 }) },
      });

      cy.intercept("POST", `/v1/trackGroups/${featuredRelease.id}/wishlist`, {
        statusCode: 200,
        body: { result: {} },
      }).as("wishlistAlbum");
    });

    it("wishlist button toggles the album directly without opening a dropdown", () => {
      visitWithTrack(trackId);

      cy.get('[data-cy="player-actions"] button.wishlist', {
        timeout: 10000,
      }).click();

      cy.contains("Wishlist this track").should("not.exist");
      cy.contains("Wishlist this album").should("not.exist");

      cy.wait("@wishlistAlbum")
        .its("request.body")
        .should("deep.equal", { wishlist: true });
    });
  });
});
