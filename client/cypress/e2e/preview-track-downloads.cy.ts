/// <reference types="cypress" />

const customerEmail = "preview-download-customer@example.com";
const customerPassword = "test1234";
const artistOwnerEmail = "preview-download-artist@example.com";
const artistOwnerPassword = "test1234";

const artistSlug = "preview-download-artist";
const preOrderReleaseSlug = "preview-download-preorder";
const releasedAlbumSlug = "preview-download-released";

const futureReleaseDate = new Date(
  Date.now() + 30 * 24 * 60 * 60 * 1000
).toISOString();

const pastReleaseDate = new Date(
  Date.now() - 24 * 60 * 60 * 1000
).toISOString();

describe("preview track downloads with album purchase", () => {
  let preOrderTrackGroupId: number;
  let previewTrackId: number;
  let nonPreviewTrackId: number;
  let releasedTrackGroupId: number;

  before(() => {
    cy.task("clearTables");

    let customerId: number;
    let artistId: number;

    cy.task("createUser", {
      email: artistOwnerEmail,
      password: artistOwnerPassword,
      emailConfirmationToken: null,
      name: "Preview Download Artist Owner",
      currency: "usd",
    })
      .then((owner) => {
        const typedOwner = owner as { user: { id: number } };
        return cy.task("createArtist", {
          userId: typedOwner.user.id,
          name: "Preview Download Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };
        artistId = typedArtist.id;
        return cy.task("createUser", {
          email: customerEmail,
          password: customerPassword,
          emailConfirmationToken: null,
          name: "Preview Download Customer",
          currency: "usd",
        });
      })
      .then((customer) => {
        const typedCustomer = customer as { user: { id: number } };
        customerId = typedCustomer.user.id;

        return cy.task("createTrackGroup", {
          artistId,
          title: "Preview Download Pre-Order",
          urlSlug: preOrderReleaseSlug,
          published: true,
          isGettable: true,
          releaseDate: futureReleaseDate,
        });
      })
      .then((trackGroup) => {
        const tg = trackGroup as { id: number };
        preOrderTrackGroupId = tg.id;

        return cy.task("createTrack", {
          title: "Preview Track",
          urlSlug: "preview-track",
          trackGroupId: tg.id,
          isPreview: true,
          allowIndividualSale: true,
        });
      })
      .then((track) => {
        const t = track as { id: number };
        previewTrackId = t.id;

        return cy.task("createTrack", {
          title: "Non-Preview Track",
          urlSlug: "non-preview-track",
          trackGroupId: preOrderTrackGroupId,
          isPreview: false,
          allowIndividualSale: true,
        });
      })
      .then((track) => {
        const t = track as { id: number };
        nonPreviewTrackId = t.id;

        return cy.task("createUserTrackGroupPurchase", {
          purchaserUserId: customerId,
          trackGroupId: preOrderTrackGroupId,
        });
      })
      .then(() => {
        return cy.task("createTrackGroup", {
          artistId,
          title: "Preview Download Released",
          urlSlug: releasedAlbumSlug,
          published: true,
          isGettable: true,
          releaseDate: pastReleaseDate,
        });
      })
      .then((trackGroup) => {
        const tg = trackGroup as { id: number };
        releasedTrackGroupId = tg.id;

        return cy.task("createUserTrackGroupPurchase", {
          purchaserUserId: customerId,
          trackGroupId: releasedTrackGroupId,
        });
      });
  });

  beforeEach(() => {
    cy.login({ email: customerEmail, password: customerPassword });
  });

  describe("pre-order album (future release date)", () => {
    it("does not show album download button before release date", () => {
      cy.visit(`/${artistSlug}/release/${preOrderReleaseSlug}`);

      cy.get('[data-testid="download-button"]').should("not.exist");
    });

    it("shows download button for a preview track when album is purchased", () => {
      cy.visit(
        `/${artistSlug}/release/${preOrderReleaseSlug}/tracks/${previewTrackId}`
      );

      cy.get('[data-testid="download-button"]').should("exist");
    });

    it("does not show download button for a non-preview track without direct purchase", () => {
      cy.visit(
        `/${artistSlug}/release/${preOrderReleaseSlug}/tracks/${nonPreviewTrackId}`
      );

      cy.get('[data-testid="download-button"]').should("not.exist");
    });
  });

  describe("released album (past release date)", () => {
    it("shows album download button after release date when album is purchased", () => {
      cy.visit(`/${artistSlug}/release/${releasedAlbumSlug}`);

      cy.get('[data-testid="download-button"]').should("exist");
    });
  });
});
