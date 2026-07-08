/// <reference types="cypress" />

// Regression test for: notification feed must include trackGroup.currency.
//
// The currency field was removed from the TrackGroup DB model and is now
// computed from artist.user.currency. The notification feed endpoint had a
// separate Prisma query that didn't include artist.user, so trackGroup.currency
// came back undefined — breaking BuyTrackGroup, PurchaseAlbumModal, etc.

const artistEmail = "artist-notif@example.com";
const artistPassword = "test1234";
const buyerEmail = "buyer-notif@example.com";
const buyerPassword = "test1234";

describe("notification feed currency", () => {
  let artistId: number;
  let artistUserId: number;
  let buyerUserId: number;
  let trackGroupId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: artistEmail,
      password: artistPassword,
      emailConfirmationToken: null,
      name: "Euro Artist",
      currency: "eur",
    })
      .then((result: any) => {
        artistUserId = result.user.id;
        return cy.task("createArtist", {
          userId: artistUserId,
          name: "Euro Artist",
          urlSlug: "euro-artist",
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createTrackGroup", {
          title: "Euro Album",
          urlSlug: "euro-album",
          artistId,
          published: true,
          isPublic: true,
        });
      })
      .then((trackGroup: any) => {
        trackGroupId = trackGroup.id;
        return cy.task("createUser", {
          email: buyerEmail,
          password: buyerPassword,
          emailConfirmationToken: null,
          name: "Buyer",
        });
      })
      .then((result: any) => {
        buyerUserId = result.user.id;
        return cy.task("createUserTrackGroupPurchase", {
          purchaserUserId: buyerUserId,
          trackGroupId,
          data: { amount: 1500, currency: "eur" },
        });
      })
      .then(() => {
        return cy.task("createNotification", {
          userId: artistUserId,
          notificationType: "USER_BOUGHT_YOUR_ALBUM",
          trackGroupId,
          relatedUserId: buyerUserId,
          artistId,
        });
      });
  });

  beforeEach(() => {
    cy.login({ email: artistEmail, password: artistPassword });
    cy.intercept(
      "GET",
      /\/v1\/users\/\d+\/notifications.*notificationType=USER_BOUGHT_YOUR_ALBUM/
    ).as("fetchPurchaseNotifs");
  });

  it("returns trackGroup.currency in the notification feed API response", () => {
    cy.visit(`/listener/notifications`);
    cy.wait("@fetchPurchaseNotifs").then((interception) => {
      const results = interception.response?.body?.results;
      expect(results).to.have.length.greaterThan(0);
      const notification = results.find(
        (n: any) => n.notificationType === "USER_BOUGHT_YOUR_ALBUM"
      );
      expect(notification).to.exist;
      expect(notification.trackGroup).to.exist;
      expect(notification.trackGroup.currency).to.eq("eur");
    });
  });

  it("displays the purchase amount with the correct currency symbol", () => {
    cy.visit(`/listener/notifications`);
    cy.wait("@fetchPurchaseNotifs");
    cy.contains("€15.00").should("exist");
  });
});
