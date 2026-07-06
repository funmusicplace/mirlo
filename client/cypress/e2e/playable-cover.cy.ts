import { TRACK_GROUP_EXAMPLE } from "../../../client/test/mocks";

const artistSlug = "example-artist";
const albumSlug = "example-album";

const playableRelease = {
  ...TRACK_GROUP_EXAMPLE,
  title: "Example Album",
  urlSlug: albumSlug,
  artist: {
    ...TRACK_GROUP_EXAMPLE.artist,
    urlSlug: artistSlug,
  },
  tracks: [
    {
      id: 101,
      title: "Example Track",
      order: 1,
      isPlayable: true,
      urlSlug: "example-track",
    },
  ],
};

const stubHomeRoutes = () => {
  cy.intercept("GET", "/auth/profile", {
    statusCode: 200,
    body: { result: null },
  });

  cy.intercept("GET", "/v1/trackGroups*", {
    statusCode: 200,
    body: { results: [playableRelease], total: 1 },
  });

  cy.intercept("GET", "/v1/trackGroups/topSold*", {
    statusCode: 200,
    body: { results: [], total: 0 },
  });

  cy.intercept("GET", "/v1/tags*", {
    statusCode: 200,
    body: { results: [], total: 0 },
  });

  cy.intercept("GET", "/v1/settings/instanceArtist", {
    statusCode: 200,
    body: { result: null },
  });

  cy.intercept("GET", "/v1/settings/featuredArtists", {
    statusCode: 200,
    body: { result: [] },
  });
};

/**
 * Cypress (Electron) does not match `(pointer: coarse)` from viewport alone.
 * Inject the touch layout rules so we can assert touch behavior in CI.
 */
const injectCoarsePointerStyles = (win: Window) => {
  const style = win.document.createElement("style");
  style.setAttribute("data-cy", "coarse-pointer");
  style.textContent = `
    [data-playable-overlay] {
      opacity: 1 !important;
      background-color: transparent !important;
      pointer-events: none;
    }
    [data-playable-overlay] .go-to-link { display: none !important; }
    [data-playable-overlay] [data-playable-wide-action] { display: none !important; }
    [data-playable-overlay] .overlay-actions { pointer-events: auto; z-index: 5; }
    a.go-to-touch-link.hidden { display: block !important; }
  `;
  win.document.head.appendChild(style);
};

const getReleaseCard = () =>
  cy.contains("li", playableRelease.title).should("be.visible");

const getPlayableCover = () =>
  getReleaseCard().find(".playable-cover").should("exist");

describe("PlayableCover go-to", () => {
  describe("pointer: fine (desktop)", () => {
    beforeEach(() => {
      stubHomeRoutes();
      cy.visit("/");
      cy.contains("Recent releases").scrollIntoView();
      getPlayableCover();
    });
    it("reveals the overlay and go-to faux button when the title link is keyboard focused", () => {
      getReleaseCard()
        .contains("a", playableRelease.title)
        .focus()
        .should("have.focus");

      getPlayableCover()
        .find("[data-playable-overlay]")
        .should("have.css", "opacity", "1");

      getPlayableCover()
        .find(".go-to-faux")
        .should("be.visible")
        .and("contain", "Go to track");
    });

    it("keeps the overlay go-to link out of the tab order", () => {
      getPlayableCover()
        .find("a.go-to-link")
        .should("have.attr", "aria-hidden", "true")
        .and("have.attr", "tabindex", "-1");
    });

    it("associates the title link with the screen-reader go-to label", () => {
      getPlayableCover()
        .find("a.go-to-link .sr-only")
        .invoke("attr", "id")
        .then((goToId) => {
          expect(goToId).to.be.a("string").and.not.be.empty;
          getReleaseCard()
            .contains("a", playableRelease.title)
            .invoke("attr", "aria-describedby")
            .should("contain", goToId);
        });
    });

    it("does not show the touch navigation link", () => {
      getPlayableCover().find("a.go-to-touch-link").should("not.be.visible");
    });
  });

  describe("pointer: coarse (touch)", () => {
    beforeEach(() => {
      stubHomeRoutes();
      cy.visit("/", { onBeforeLoad: injectCoarsePointerStyles });
      cy.contains("Recent releases").scrollIntoView();
      getPlayableCover();
    });
    it("shows play/pause without the overlay scrim or go-to link", () => {
      getPlayableCover().find("a.go-to-link").should("not.be.visible");
      getPlayableCover()
        .find("[data-playable-play-control] button")
        .should("be.visible");
    });

    it("navigates to the release when the cover is tapped", () => {
      getPlayableCover().click("topLeft");
      cy.url().should("include", `/${artistSlug}/release/${albumSlug}`);
    });

    it("still allows tapping the play control", () => {
      getPlayableCover()
        .find("[data-playable-play-control] button")
        .click();

      cy.window().then((win) => {
        const state = JSON.parse(win.localStorage.getItem("nomadState") ?? "{}");
        expect(state.playerQueueIds).to.deep.equal([101]);
      });
    });

    it("keeps the touch navigation link out of the tab order", () => {
      getPlayableCover()
        .find("a.go-to-touch-link")
        .should("have.attr", "aria-hidden", "true")
        .and("have.attr", "tabindex", "-1");
    });
  });
});
