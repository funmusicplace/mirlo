/// <reference types="cypress" />

const apiUrl = "http://localhost:3000";
const artistEmail = "artist-merch@example.com";
const artistPassword = "test1234";
const artistSlug = "euro-merch-artist";
const merchSlug = "test-merch";

describe("merch view currency", () => {
  let artistId: number;
  let merchId: string;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: artistEmail,
      password: artistPassword,
      emailConfirmationToken: null,
      name: "Euro Merch Artist",
      currency: "eur",
    })
      .then((result: any) => {
        return cy.task("createArtist", {
          userId: result.user.id,
          name: "Euro Merch Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createMerch", {
          artistId,
          title: "Test Merch",
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
          costUnit: 0,
          costExtraUnit: 0,
        });
      });
  });

  it("returns currency in the public merch API response", () => {
    cy.request(`${apiUrl}/v1/merch/${merchId}`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.result).to.exist;
      expect(response.body.result.currency).to.eq("eur");
    });
  });

  it("returns currency on the merch detail page fetch", () => {
    cy.intercept("GET", "**/v1/merch/test-merch*").as("fetchMerch");
    cy.visit(`/${artistSlug}/merch/${merchSlug}`);
    cy.wait("@fetchMerch").then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body?.result?.currency).to.eq("eur");
    });
    cy.contains("Test Merch").should("exist");
  });
});
