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
  let customerId: number;
  let artistId: number;
  let preOrderTrackGroupId: number;
  let previewTrackId: number;
  let nonPreviewTrackId: number;
  let releasedTrackGroupId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: artistOwnerEmail,
      password: artistOwnerPassword,
      emailConfirmationToken: null,
      name: "Preview Download Artist Owner",
      currency: "usd",
    })
      .then((owner: any) => cy.task("createArtist", { userId: owner.user.id, name: "Preview Download Artist", urlSlug: artistSlug }))
      .then((artist: any) => { artistId = artist.id; return cy.task("createUser", { email: customerEmail, password: customerPassword, emailConfirmationToken: null, name: "Preview Download Customer", currency: "usd" }); })
      .then((customer: any) => { customerId = customer.user.id; return cy.task("createTrackGroup", { artistId, title: "Preview Download Pre-Order", urlSlug: preOrderReleaseSlug, published: true, isGettable: true, releaseDate: futureReleaseDate }); })
      .then((tg: any) => { preOrderTrackGroupId = tg.id; return cy.task("createTrack", { title: "Preview Track", urlSlug: "preview-track", trackGroupId: tg.id, isPreview: true, allowIndividualSale: true }); })
      .then((track: any) => { previewTrackId = track.id; return cy.task("createTrack", { title: "Non-Preview Track", urlSlug: "non-preview-track", trackGroupId: preOrderTrackGroupId, isPreview: false, allowIndividualSale: true }); })
      .then((track: any) => { nonPreviewTrackId = track.id; return cy.task("createUserTrackGroupPurchase", { purchaserUserId: customerId, trackGroupId: preOrderTrackGroupId }); })
      .then(() => cy.task("createTrackGroup", { artistId, title: "Preview Download Released", urlSlug: releasedAlbumSlug, published: true, isGettable: true, releaseDate: pastReleaseDate }))
      .then((tg: any) => { releasedTrackGroupId = tg.id; return cy.task("createUserTrackGroupPurchase", { purchaserUserId: customerId, trackGroupId: releasedTrackGroupId }); });
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
      cy.visit(`/${artistSlug}/release/${preOrderReleaseSlug}/tracks/${previewTrackId}`);
      cy.get('[data-testid="download-button"]').should("exist");
    });

    it("does not show download button for a non-preview track without direct purchase", () => {
      cy.visit(`/${artistSlug}/release/${preOrderReleaseSlug}/tracks/${nonPreviewTrackId}`);
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
