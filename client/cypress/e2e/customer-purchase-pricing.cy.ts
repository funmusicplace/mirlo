/// <reference types="cypress" />

const customerEmail = "pricing-customer@example.com";
const customerPassword = "test1234";
const artistOwnerEmail = "pricing-artist-owner@example.com";
const artistOwnerPassword = "test1234";

const artistSlug = "customer-pricing-artist";
const releaseSlug = "customer-pricing-release";

describe("customer purchase pricing", () => {
  let trackGroupId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: customerEmail,
      password: customerPassword,
      emailConfirmationToken: null,
      name: "Pricing Customer",
      currency: "usd",
    })
      .then(() => {
        return cy.task("createUser", {
          email: artistOwnerEmail,
          password: artistOwnerPassword,
          emailConfirmationToken: null,
          name: "Pricing Artist Owner",
          currency: "usd",
        });
      })
      .then((owner) => {
        const typedOwner = owner as { user: { id: number } };

        return cy.task("createArtist", {
          userId: typedOwner.user.id,
          name: "Customer Pricing Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };

        return cy.task("createTrackGroup", {
          artistId: typedArtist.id,
          title: "Customer Pricing Release",
          urlSlug: releaseSlug,
          minPrice: 300,
          suggestedPrice: 700,
          published: true,
          isGettable: true,
        });
      })
      .then((trackGroup) => {
        const typedTrackGroup = trackGroup as { id: number };
        trackGroupId = typedTrackGroup.id;
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

    cy.intercept("POST", `/v1/trackGroups/${trackGroupId}/purchase`, (req) => {
      req.reply({
        statusCode: 200,
        body: {
          redirectUrl: "/",
        },
      });
    }).as("purchaseTrackGroup");
  });

  it("defaults purchase price to suggested price and submits it", () => {
    cy.visit(`/${artistSlug}/release/${releaseSlug}`);

    cy.contains("button", "Buy").click();
    cy.wait("@stripeStatus");

    cy.get('[role="dialog"]').within(() => {
      cy.get("#priceInput").should("have.value", "7");
      cy.contains("button", "Buy").click();
    });

    cy.wait("@purchaseTrackGroup")
      .its("request.body")
      .should((body) => {
        expect(body.price).to.eq(700);
      });
  });
});
