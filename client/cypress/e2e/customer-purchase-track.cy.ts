/// <reference types="cypress" />

const customerEmail = "track-purchase-customer@example.com";
const customerPassword = "test1234";
const artistOwnerEmail = "track-purchase-artist-owner@example.com";
const artistOwnerPassword = "test1234";

const artistSlug = "track-purchase-artist";
const releaseSlug = "track-purchase-release";

// Covers the track migration onto the unified POST /v1/purchase flow: a
// single, individually-sellable track should submit `{ items: [{ type:
// "track", id }] }`, the same way the album purchase already does for
// `{ type: "trackGroup" }` (see customer-purchase-pricing.cy.ts).
describe("customer purchase - single track", () => {
  let trackId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: customerEmail,
      password: customerPassword,
      emailConfirmationToken: null,
      name: "Track Purchase Customer",
      currency: "usd",
    })
      .then(() => {
        return cy.task("createUser", {
          email: artistOwnerEmail,
          password: artistOwnerPassword,
          emailConfirmationToken: null,
          name: "Track Purchase Artist Owner",
          currency: "usd",
        });
      })
      .then((owner) => {
        const typedOwner = owner as { user: { id: number } };

        return cy.task("createArtist", {
          userId: typedOwner.user.id,
          name: "Track Purchase Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };

        // The buy/name-your-price button label is driven by the trackGroup's
        // minPrice, not the individual track's — keep it non-zero here so the
        // button reads "Buy" rather than "name your price" (#see PurchaseAlbumModal).
        return cy.task("createTrackGroup", {
          artistId: typedArtist.id,
          title: "Track Purchase Release",
          urlSlug: releaseSlug,
          minPrice: 300,
          published: true,
          isGettable: true,
        });
      })
      .then((trackGroup) => {
        const typedTrackGroup = trackGroup as { id: number };

        return cy.task("createTrack", {
          trackGroupId: typedTrackGroup.id,
          title: "Individually Sellable Track",
          minPrice: 300,
          allowIndividualSale: true,
        });
      })
      .then((track) => {
        const typedTrack = track as { id: number };
        trackId = typedTrack.id;
      });
  });

  beforeEach(() => {
    cy.login({ email: customerEmail, password: customerPassword });

    cy.intercept("GET", "/v1/users/*/stripe/checkAccountStatus", {
      statusCode: 200,
      body: {
        result: {
          chargesEnabled: true,
          detailsSubmitted: true,
          stripeAccountId: "acct_test_123",
        },
      },
    }).as("stripeStatus");

    cy.intercept("POST", "/v1/purchase", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          redirectUrl: "/",
        },
      });
    }).as("purchaseTrack");
  });

  it("purchases the track (not the trackGroup) via the unified endpoint", () => {
    cy.visit(`/${artistSlug}/release/${releaseSlug}/tracks/${trackId}`);

    cy.contains("button", "Buy").click();
    cy.wait("@stripeStatus");

    cy.get('[role="dialog"]').within(() => {
      cy.get("#priceInput").should("have.value", "3");
      cy.contains("button", "Buy").click();
    });

    cy.wait("@purchaseTrack")
      .its("request.body")
      .should((body) => {
        expect(body.artistId).to.exist;
        expect(body.items).to.have.length(1);
        expect(body.items[0].type).to.eq("track");
        expect(body.items[0].id).to.eq(trackId);
      });
  });
});
