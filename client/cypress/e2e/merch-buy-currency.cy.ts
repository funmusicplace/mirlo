/// <reference types="cypress" />

const artistEmail = "artist-buy-merch@example.com";
const artistPassword = "test1234";
const artistSlug = "euro-buy-merch-artist";
const merchSlug = "test-buy-merch";

describe("merch buy currency", () => {
  let artistId: number;
  let merchId: string;
  let artistUserId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: artistEmail,
      password: artistPassword,
      emailConfirmationToken: null,
      name: "Euro Buy Merch Artist",
      currency: "eur",
    })
      .then((result: any) => {
        artistUserId = result.user.id;
        return cy.task("createArtist", {
          userId: artistUserId,
          name: "Euro Buy Merch Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createMerch", {
          artistId,
          title: "Test Buy Merch",
          minPrice: 1500,
          isPublic: true,
          quantityRemaining: 10,
        });
      })
      .then((merch: any) => {
        merchId = merch.id;
        return cy.task("createMerchShippingDestination", {
          merchId,
          homeCountry: "us",
          destinationCountry: null,
          costUnit: 500,
          costExtraUnit: 100,
        });
      });
  });

  beforeEach(() => {
    cy.intercept("GET", "**/v1/users/*/stripe/checkAccountStatus", {
      result: {
        chargesEnabled: true,
        stripeAccountId: "acct_test",
        detailsSubmitted: true,
      },
    }).as("stripeStatus");
  });

  it("opens the buy modal and displays shipping cost without crashing", () => {
    cy.visit(`/${artistSlug}/merch/${merchSlug}`);
    cy.contains("Test Buy Merch").should("exist");

    cy.contains("button", /buy/i).click();

    cy.contains("€5.00").should("exist");
  });
});
