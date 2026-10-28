import { TRACK_GROUP_EXAMPLE } from "../../../client/test/mocks";

const trackId = 1;
const artistSlug = "example-artist";

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

describe("skip links", { screenshotOnRunFailure: false }, () => {
  beforeEach(() => {
    cy.intercept("GET", `/v1/tracks/${trackId}`, {
      statusCode: 200,
      body: { result: track },
    });

    cy.visit("/", {
      onBeforeLoad(window) {
        window.localStorage.removeItem("nomadState");
      },
    });
  });

  it("has a skip to main content link as the first link", () => {
    cy.findAllByRole("link")
      .first()
      .should("have.text", "Skip to main content");
  });

  it("has a valid target for the skip to main content link", () => {
    cy.findAllByRole("link")
      .first()
      .then(($element) => {
        const idFromHref = $element.attr("href");
        cy.get(idFromHref);
      });
  });

  it("has a skip to audio player link as the second link when player is visible", () => {
    cy.visit("/", {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          "nomadState",
          JSON.stringify({
            playerQueueIds: [trackId],
            currentlyPlayingIndex: 0,
          })
        );
      },
    });
    cy.findAllByRole("link").eq(1).should("have.text", "Skip to audio player");
  });

  it("doesn't have a skip to audio player link when player is not visible", () => {
    cy.findAllByRole("link")
      .eq(1)
      .should("not.have.text", "Skip to audio player");
  });

  it("has a valid target for the skip to audio player link", () => {
    cy.visit("/", {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          "nomadState",
          JSON.stringify({
            playerQueueIds: [trackId],
            currentlyPlayingIndex: 0,
          })
        );
      },
    });
    cy.findByRole("link", { name: "Skip to audio player" }).then(($element) => {
      const idFromHref = $element.attr("href");
      cy.get(idFromHref);
    });
  });

  it("visually hides skip links unless they are focused", () => {
    cy.findAllByRole("link").first().parent().should("have.class", "sr-only");
    cy.findAllByRole("link").first().focus();
    cy.findAllByRole("link")
      .first()
      .parent()
      .should("have.class", "focus-within:not-sr-only");
  });
});
