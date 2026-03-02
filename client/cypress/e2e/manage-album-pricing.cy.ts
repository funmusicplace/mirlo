/// <reference types="cypress" />

const userEmail = "pricing-admin@example.com";
const userPassword = "test1234";

describe("manage album pricing", () => {
  let artistId: number;
  let trackGroupId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: userEmail,
      password: userPassword,
      emailConfirmationToken: null,
      name: "Pricing Admin",
      currency: "usd",
    })
      .then((user) => {
        const typedUser = user as { user: { id: number } };
        return cy
          .login({ email: userEmail, password: userPassword })
          .then(() => typedUser);
      })
      .then((user) => {
        return cy.task("createArtist", {
          userId: user.user.id,
          name: "Pricing Artist",
          urlSlug: "pricing-artist",
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };
        artistId = typedArtist.id;
        return cy.task("createTrackGroup", {
          artistId,
          title: "Pricing Album",
          urlSlug: "pricing-album",
          minPrice: 300,
        });
      })
      .then((trackGroup) => {
        const typedTrackGroup = trackGroup as { id: number };
        trackGroupId = typedTrackGroup.id;
      });
  });

  beforeEach(() => {
    cy.intercept("GET", "/auth/profile").as("authProfile");
    cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}`).as(
      "updateTrackGroup"
    );

    cy.visit(`/manage/artists/${artistId}/release/${trackGroupId}`);
    cy.wait("@authProfile");
    cy.contains("h2", "Price & such").should("exist");
  });

  it("updates pricing mode and suggested price payloads", () => {
    cy.contains("button", "No payments").click();
    cy.wait("@updateTrackGroup")
      .its("request.body")
      .should((body) => {
        expect(body).to.include({
          artistId,
          isGettable: false,
          minPrice: 0,
          suggestedPrice: null,
        });
      });

    cy.contains("button", "$0 or donate").click();
    cy.wait("@updateTrackGroup")
      .its("request.body")
      .should((body) => {
        expect(body).to.include({
          artistId,
          isGettable: true,
          minPrice: 0,
        });
      });

    cy.get("#hasSuggestedPrice").check({ force: true });
    cy.wait("@updateTrackGroup")
      .its("request.body")
      .should((body) => {
        expect(body).to.include({
          artistId,
          isGettable: true,
          minPrice: 0,
          suggestedPrice: 100,
        });
      });

    cy.contains("button", "Paid").click();
    cy.wait("@updateTrackGroup")
      .its("request.body")
      .should((body) => {
        expect(body).to.include({
          artistId,
          isGettable: true,
          minPrice: 100,
          suggestedPrice: 100,
        });
      });

    cy.get("#hasSuggestedPrice").uncheck({ force: true });
    cy.wait("@updateTrackGroup")
      .its("request.body")
      .should((body) => {
        expect(body).to.include({
          artistId,
          isGettable: true,
          minPrice: 1 * 100,
          suggestedPrice: null,
        });
      });
  });
});
