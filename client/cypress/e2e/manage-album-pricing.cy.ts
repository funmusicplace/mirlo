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
          publishedAt: null,
        });
      })
      .then((trackGroup) => {
        const typedTrackGroup = trackGroup as { id: number };
        trackGroupId = typedTrackGroup.id;
      });
  });

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login({ email: userEmail, password: userPassword });
    cy.intercept("GET", "/auth/profile").as("authProfile");
    cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}`).as(
      "updateTrackGroup"
    );
    cy.visit(`/manage/artists/${artistId}/release/${trackGroupId}`);
    cy.wait("@authProfile");
    cy.contains("h2", "Pricing").should("exist");
  });

  it("pricing mode toggles only commit on Save draft click", () => {
    cy.contains("button", "No payments").click();
    cy.wait(500);
    cy.get("@updateTrackGroup.all").should("have.length", 0);

    cy.contains("button", "Save draft").click();
    cy.wait("@updateTrackGroup")
      .its("request.body")
      .should((body) => {
        expect(body).to.include({
          artistId,
          isGettable: false,
        });
      });
    // let save()'s reset + reload settle after the intercepted PUT response
    cy.wait(200);

    cy.contains("button", "$0 or donate").click();
    cy.contains("button", "Save draft").click();
    cy.wait("@updateTrackGroup")
      .its("request.body")
      .should((body) => {
        expect(body).to.include({
          artistId,
          isGettable: true,
          minPrice: 0,
          suggestedPrice: 0,
        });
      });
    cy.wait(200);

    cy.contains("button", "Paid").click();
    cy.contains("button", "Save draft").click();
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
    cy.wait(200);
  });
});
