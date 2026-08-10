/// <reference types="cypress" />

// Covers two production bugs on the artist support page:
// - a cancelled-but-not-yet-expired subscription locked the page onto the
//   manage-subscription view, with no way to resubscribe (support/Index.tsx
//   and ArtistSupportBox.tsx)
// - subscribing to a variable-amount tier could send a non-numeric `amount`
//   to POST /v1/purchase (ArtistVariableSupport.tsx)
const artistOwnerEmail = "sub-status-artist-owner@example.com";
const artistOwnerPassword = "test1234";
const activeUserEmail = "sub-status-active@example.com";
const activeUserPassword = "test1234";
const cancelledUserEmail = "sub-status-cancelled@example.com";
const cancelledUserPassword = "test1234";
const newUserEmail = "sub-status-new@example.com";
const newUserPassword = "test1234";

const artistSlug = "sub-status-artist";
const tierName = "Supporter";

describe("artist support page subscription status", () => {
  let tierId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: artistOwnerEmail,
      password: artistOwnerPassword,
      emailConfirmationToken: null,
      name: "Sub Status Artist Owner",
      currency: "usd",
    })
      .then((owner: any) =>
        cy.task("createArtist", {
          userId: owner.user.id,
          name: "Sub Status Artist",
          urlSlug: artistSlug,
        })
      )
      .then((artist: any) =>
        cy.task("createTier", {
          artistId: artist.id,
          name: tierName,
          minAmount: 500,
        })
      )
      .then((tier: any) => {
        tierId = tier.id;
      });

    cy.task("createUser", {
      email: activeUserEmail,
      password: activeUserPassword,
      emailConfirmationToken: null,
      name: "Active Subscriber",
      currency: "usd",
    }).then((user: any) =>
      cy.task("createSubscription", { userId: user.user.id, tierId })
    );

    cy.task("createUser", {
      email: cancelledUserEmail,
      password: cancelledUserPassword,
      emailConfirmationToken: null,
      name: "Cancelled Subscriber",
      currency: "usd",
    }).then((user: any) =>
      cy.task("createSubscription", {
        userId: user.user.id,
        tierId,
        deleteReason: "USER_CANCELLED",
        nextBillingDate: "2099-01-01",
      })
    );

    cy.task("createUser", {
      email: newUserEmail,
      password: newUserPassword,
      emailConfirmationToken: null,
      name: "Prospective Subscriber",
      currency: "usd",
    });
  });

  beforeEach(() => {
    cy.intercept("GET", "/v1/users/*/stripe/checkAccountStatus", {
      statusCode: 200,
      body: {
        result: {
          chargesEnabled: true,
          detailsSubmitted: true,
          stripeAccountId: "acct_test_sub_status",
        },
      },
    }).as("stripeStatus");
  });

  it("shows the active subscription's tier, no cancelled notice, and still shows the tier picker to switch tiers", () => {
    cy.login({ email: activeUserEmail, password: activeUserPassword });
    cy.visit(`/${artistSlug}/support`);
    cy.wait("@stripeStatus");

    cy.contains(tierName);
    cy.contains("cancelled").should("not.exist");
    cy.contains("button", "Change payment method");
    cy.contains("button", "Cancel subscription");
  });

  it("shows both the cancelled notice and a way to resubscribe", () => {
    cy.login({ email: cancelledUserEmail, password: cancelledUserPassword });
    cy.visit(`/${artistSlug}/support`);
    cy.wait("@stripeStatus");

    cy.contains("Your subscription is cancelled");
    cy.contains("button", "Support");
  });

  it("lets a user with no subscription choose a new one", () => {
    cy.login({ email: newUserEmail, password: newUserPassword });

    cy.intercept("POST", "/v1/purchase", (req) => {
      req.reply({
        statusCode: 200,
        body: { clientSecret: "seti_secret", stripeAccountId: "acct_1" },
      });
    }).as("purchase");

    cy.visit(`/${artistSlug}/support`);
    cy.wait("@stripeStatus");

    cy.contains("Your subscription is cancelled").should("not.exist");
    cy.contains("button", "Support").click();

    cy.wait("@purchase")
      .its("request.body")
      .should((body) => {
        expect(body.items).to.have.length(1);
        expect(body.items[0].type).to.eq("subscription");
        expect(body.items[0].tierId).to.eq(tierId);
        expect(body.items[0].amount).to.eq(500);
      });
  });
});
