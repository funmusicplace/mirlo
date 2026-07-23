/// <reference types="cypress" />

const customerEmail = "merch-purchase-customer@example.com";
const customerPassword = "test1234";
const artistOwnerEmail = "merch-purchase-artist-owner@example.com";
const artistOwnerPassword = "test1234";

const artistSlug = "merch-purchase-artist";
const merchSlug = "merch-purchase-item";

// Covers the merch migration onto the unified POST /v1/purchase flow: the
// submitted cart carries shippingDestinationId (and, when present,
// merchOptionIds) alongside quantity/price the same way trackGroup/track do
// (see customer-purchase-pricing.cy.ts / customer-purchase-track.cy.ts).
describe("customer purchase - merch", () => {
  let merchId: string;
  let shippingDestinationId: string;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: customerEmail,
      password: customerPassword,
      emailConfirmationToken: null,
      name: "Merch Purchase Customer",
      currency: "usd",
    })
      .then(() => {
        return cy.task("createUser", {
          email: artistOwnerEmail,
          password: artistOwnerPassword,
          emailConfirmationToken: null,
          name: "Merch Purchase Artist Owner",
          currency: "usd",
        });
      })
      .then((owner) => {
        const typedOwner = owner as { user: { id: number } };

        return cy.task("createArtist", {
          userId: typedOwner.user.id,
          name: "Merch Purchase Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };

        return cy.task("createMerch", {
          artistId: typedArtist.id,
          title: "Merch Purchase Item",
          urlSlug: merchSlug,
          minPrice: 1500,
          isPublic: true,
          quantityRemaining: 10,
        });
      })
      .then((merch) => {
        const typedMerch = merch as { id: string };
        merchId = typedMerch.id;

        return cy.task("createMerchShippingDestination", {
          merchId,
          homeCountry: "us",
          destinationCountry: null,
          costUnit: 500,
          costExtraUnit: 100,
        });
      })
      .then((destination) => {
        const typedDestination = destination as { id: string };
        shippingDestinationId = typedDestination.id;
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

    // A redirectUrl response (rather than clientSecret) keeps this test from
    // needing to load real Stripe.js / render the Payment Element — the same
    // shortcut customer-purchase-track.cy.ts and customer-purchase-pricing.cy.ts
    // use, since only the submitted cart shape is under test here.
    cy.intercept("POST", "/v1/purchase", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          redirectUrl: "/",
        },
      });
    }).as("purchaseMerch");
  });

  it("submits quantity, price, and shipping destination via the unified endpoint", () => {
    cy.visit(`/${artistSlug}/merch/${merchSlug}`);

    cy.contains("button", /buy/i).click();
    cy.wait("@stripeStatus");

    cy.get('[role="dialog"]').within(() => {
      cy.get("#quantity").clear().type("2");
      cy.contains("button", "Proceed to checkout").click();
    });

    cy.wait("@purchaseMerch")
      .its("request.body")
      .should((body) => {
        expect(body.artistId).to.exist;
        expect(body.items).to.have.length(1);
        expect(body.items[0].type).to.eq("merch");
        expect(body.items[0].id).to.eq(merchId);
        expect(body.items[0].quantity).to.eq(2);
        expect(body.items[0].price).to.eq("1500");
        expect(body.items[0].shippingDestinationId).to.eq(
          shippingDestinationId
        );
      });
  });
});
