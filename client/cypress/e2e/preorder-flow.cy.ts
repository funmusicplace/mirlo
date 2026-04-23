/// <reference types="cypress" />

const ownerEmail = "preorder-owner@example.com";
const ownerPassword = "test1234";
const customerEmail = "preorder-customer@example.com";
const customerPassword = "test1234";

const artistSlug = "preorder-test-artist";

describe("pre-order flow", () => {
  let ownerId: number;
  let customerId: number;
  let artistId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: ownerEmail,
      password: ownerPassword,
      emailConfirmationToken: null,
      name: "Pre-order Artist Owner",
      currency: "usd",
    })
      .then((owner: any) => {
        ownerId = owner.user.id;
        return cy.task("createArtist", {
          userId: owner.user.id,
          name: "Pre-order Test Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createUser", {
          email: customerEmail,
          password: customerPassword,
          emailConfirmationToken: null,
          name: "Pre-order Customer",
          currency: "usd",
        });
      })
      .then((customer: any) => {
        customerId = customer.user.id;
      });
  });

  describe("manage album: toggling pre-order", () => {
    let trackGroupId: number;

    before(() => {
      cy.task("createTrackGroup", {
        artistId,
        title: "Preorder Toggle Album",
        urlSlug: "preorder-toggle-album",
        published: false,
        isGettable: true,
        minPrice: 500,
      }).then((tg: any) => {
        trackGroupId = tg.id;
      });
    });

    beforeEach(() => {
      cy.login({ email: ownerEmail, password: ownerPassword });
      cy.intercept("GET", "/auth/profile").as("authProfile");
      cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}`).as(
        "updateTrackGroup"
      );
      cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}/tracks`).as(
        "bulkUpdateTracks"
      );
    });

    it("enables pre-order and sets all tracks to must-own", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.contains("Pre-order").should("exist");
      cy.contains("Setup as a pre-order").should("exist");

      // Toggle pre-order ON
      cy.contains("Setup as a pre-order").click();

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.isPreorder).to.equal(true);
        });

      cy.wait("@bulkUpdateTracks")
        .its("request.body")
        .should((body) => {
          expect(body.isPreview).to.equal(false);
        });
    });

    it("disables pre-order and resets tracks to free-listen", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      // Toggle pre-order OFF
      cy.contains("Setup as a pre-order").click();

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.isPreorder).to.equal(false);
          expect(body.scheduleEndOnReleaseDate).to.equal(false);
          expect(body.makeTracksPreviewableOnRelease).to.equal(false);
        });

      cy.wait("@bulkUpdateTracks")
        .its("request.body")
        .should((body) => {
          expect(body.isPreview).to.equal(true);
        });
    });
  });

  describe("manage album: schedule and end pre-order", () => {
    let trackGroupId: number;

    before(() => {
      const futureDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      cy.task("createTrackGroup", {
        artistId,
        title: "Schedule Preorder Album",
        urlSlug: "schedule-preorder-album",
        published: true,
        isGettable: true,
        isPreorder: true,
        releaseDate: futureDate,
        minPrice: 500,
      }).then((tg: any) => {
        trackGroupId = tg.id;
      });
    });

    beforeEach(() => {
      cy.login({ email: ownerEmail, password: ownerPassword });
      cy.intercept("GET", "/auth/profile").as("authProfile");
      cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}`).as(
        "updateTrackGroup"
      );
    });

    it("can schedule pre-order to end on release date", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.get("#input-schedule-preorder-release").check({ force: true });

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.scheduleEndOnReleaseDate).to.equal(true);
        });
    });

    it("can toggle set-tracks-free-listen-on-release when schedule is enabled", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.get("#input-make-tracks-previewable-on-release").check({
        force: true,
      });

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.makeTracksPreviewableOnRelease).to.equal(true);
        });
    });

    it("shows end pre-order modal and can end campaign", () => {
      cy.intercept(
        "POST",
        `/v1/manage/trackGroups/${trackGroupId}/endPreorder`
      ).as("endPreorder");

      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.contains("Release pre-order now").click();

      // Modal should appear
      cy.get('[role="dialog"]').within(() => {
        cy.contains("Set all tracks as playable on release day").should(
          "exist"
        );

        // Check the make-tracks-previewable checkbox in the modal
        cy.get("#input-make-tracks-previewable").check({ force: true });

        // Confirm
        cy.contains("button", "Release pre-order").click();
      });

      cy.wait("@endPreorder")
        .its("request.body")
        .should((body) => {
          expect(body.makeTracksPreviewable).to.equal(true);
        });
    });
  });

  describe("customer view: pre-order album purchase button", () => {
    let preorderTgId: number;
    let normalTgId: number;

    before(() => {
      cy.task("createTrackGroup", {
        artistId,
        title: "Customer Preorder Album",
        urlSlug: "customer-preorder-album",
        published: true,
        isGettable: true,
        isPreorder: true,
        minPrice: 500,
      }).then((tg: any) => {
        preorderTgId = tg.id;
      });

      cy.task("createTrackGroup", {
        artistId,
        title: "Customer Normal Album",
        urlSlug: "customer-normal-album",
        published: true,
        isGettable: true,
        isPreorder: false,
        minPrice: 500,
      }).then((tg: any) => {
        normalTgId = tg.id;
      });
    });

    it("shows 'Pre-order' button for pre-order album", () => {
      cy.login({ email: customerEmail, password: customerPassword });
      cy.visit(`/${artistSlug}/release/customer-preorder-album`);
      cy.contains("Pre-order").should("exist");
      cy.contains("Buy").should("not.exist");
    });

    it("shows 'Buy' button for normal album", () => {
      cy.login({ email: customerEmail, password: customerPassword });
      cy.visit(`/${artistSlug}/release/customer-normal-album`);
      cy.contains("Buy").should("exist");
    });
  });

  describe("customer view: download blocked during pre-order", () => {
    let preorderTgId: number;
    let previewTrackId: number;
    let nonPreviewTrackId: number;

    before(() => {
      cy.task("createTrackGroup", {
        artistId,
        title: "Download Block Album",
        urlSlug: "download-block-album",
        published: true,
        isGettable: true,
        isPreorder: true,
        minPrice: 500,
      })
        .then((tg: any) => {
          preorderTgId = tg.id;
          return cy.task("createTrack", {
            title: "Preview Track",
            urlSlug: "preview-track",
            trackGroupId: tg.id,
            isPreview: true,
            allowIndividualSale: true,
          });
        })
        .then((track: any) => {
          previewTrackId = track.id;
          return cy.task("createTrack", {
            title: "Non Preview Track",
            urlSlug: "non-preview-track",
            trackGroupId: preorderTgId,
            isPreview: false,
            allowIndividualSale: true,
          });
        })
        .then((track: any) => {
          nonPreviewTrackId = track.id;
          return cy.task("createUserTrackGroupPurchase", {
            purchaserUserId: customerId,
            trackGroupId: preorderTgId,
          });
        });
    });

    beforeEach(() => {
      cy.login({ email: customerEmail, password: customerPassword });
    });

    it("does not show album download button during pre-order even when purchased", () => {
      cy.visit(`/${artistSlug}/release/download-block-album`);
      cy.get('[data-testid="download-button"]').should("not.exist");
    });

    it("shows download button for preview track when album is purchased", () => {
      cy.visit(
        `/${artistSlug}/release/download-block-album/tracks/${previewTrackId}`
      );
      cy.get('[data-testid="download-button"]').should("exist");
    });

    it("does not show download button for non-preview track during pre-order", () => {
      cy.visit(
        `/${artistSlug}/release/download-block-album/tracks/${nonPreviewTrackId}`
      );
      cy.get('[data-testid="download-button"]').should("not.exist");
    });
  });

  describe("customer view: download available when not pre-order", () => {
    let normalTgId: number;

    before(() => {
      cy.task("createTrackGroup", {
        artistId,
        title: "Normal Download Album",
        urlSlug: "normal-download-album",
        published: true,
        isGettable: true,
        isPreorder: false,
        minPrice: 500,
      }).then((tg: any) => {
        normalTgId = tg.id;
        return cy.task("createUserTrackGroupPurchase", {
          purchaserUserId: customerId,
          trackGroupId: tg.id,
        });
      });
    });

    it("shows album download button when purchased and not pre-order", () => {
      cy.login({ email: customerEmail, password: customerPassword });
      cy.visit(`/${artistSlug}/release/normal-download-album`);
      cy.get('[data-testid="download-button"]').should("exist");
    });
  });
});
