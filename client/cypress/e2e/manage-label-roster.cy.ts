/// <reference types="cypress" />

const labelUserEmail = "manage-roster-label@example.com";
const labelUserPassword = "test1234";
const labelArtistName = "Test Label Profile";
const labelArtistSlug = "test-label-profile";

const rosterArtistUserEmail = "manage-roster-artist@example.com";
const rosterArtistName = "Roster Artist";
const rosterArtistSlug = "manage-roster-artist";

describe("manage label roster tab", () => {
  let labelArtistId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: labelUserEmail,
      password: labelUserPassword,
      emailConfirmationToken: null,
      name: "Label Owner",
      currency: "usd",
      canCreateArtists: true,
      isLabelAccount: true,
    })
      .then((labelUser: any) => {
        return cy.task("createArtist", {
          userId: labelUser.user.id,
          name: labelArtistName,
          urlSlug: labelArtistSlug,
          isLabelProfile: true,
        });
      })
      .then((artist: any) => {
        labelArtistId = artist.id;
        return cy.task("createUser", {
          email: rosterArtistUserEmail,
          password: "test1234",
          emailConfirmationToken: null,
          name: rosterArtistName,
          currency: "usd",
        });
      })
      .then((rosterUser: any) => {
        return cy.task("createArtist", {
          userId: rosterUser.user.id,
          name: rosterArtistName,
          urlSlug: rosterArtistSlug,
        });
      });
  });

  beforeEach(() => {
    cy.login({ email: labelUserEmail, password: labelUserPassword });
  });

  it("renders the new manage roster route without crashing", () => {
    cy.visit(`/manage/artists/${labelArtistId}/roster`);

    cy.contains("a", "Manage label artists").should("be.visible");
  });

  it("keeps the roster tab inside the manage section instead of jumping to /account/label", () => {
    cy.visit(`/manage/artists/${labelArtistId}/releases`);

    cy.get("nav").contains("a", "Roster").click();

    cy.location("pathname").should(
      "eq",
      `/manage/artists/${labelArtistId}/roster`
    );
  });

  it("redirects to /account/label when clicking the manage label artists button", () => {
    cy.visit(`/manage/artists/${labelArtistId}/roster`);

    cy.contains("a", "Manage label artists").click();

    cy.location("pathname").should("eq", "/account/label");
  });
});
