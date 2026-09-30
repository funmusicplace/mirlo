/// <reference types="cypress" />

const labelUserEmail = "label-user@example.com";
const labelUserPassword = "test1234";

const artistUserEmail = "label-artist@example.com";
const artistUserPassword = "test1234";

const labelUserName = "Label Owner";
const artistName = "Test Label Artist";
const artistSlug = "test-label-artist";

describe("labels", () => {
  let labelUserId: number;
  let artistId: number;
  let artistUserId: number;

  before(() => {
    cy.task("clearTables");

    // Create label owner user with canCreateArtists enabled
    cy.task("createUser", {
      email: labelUserEmail,
      password: labelUserPassword,
      emailConfirmationToken: null,
      name: labelUserName,
      currency: "usd",
      canCreateArtists: true,
    })
      .then((labelUser: any) => {
        labelUserId = labelUser.user.id;
        // Create artist user
        return cy.task("createUser", {
          email: artistUserEmail,
          password: artistUserPassword,
          emailConfirmationToken: null,
          name: artistName,
          currency: "usd",
        });
      })
      .then((artistUser: any) => {
        artistUserId = artistUser.user.id;
        // Create artist profile for the artist user
        return cy.task("createArtist", {
          userId: artistUserId,
          name: artistName,
          urlSlug: artistSlug,
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
      });
  });

  beforeEach(() => {
    cy.login({ email: labelUserEmail, password: labelUserPassword });
  });

  it("allows user to toggle label account on", () => {
    cy.visit("/account");

    // The switch input is visually hidden (sr-only) behind its styled track
    cy.findByRole("switch", { name: "Label/Collective account" }).click({
      force: true,
    });

    cy.findByRole("button", { name: "Update account" }).click();

    cy.findByText("Profile updated", { timeout: 5000 }).should("exist");
  });

  it("shows manage label link after enabling label account", () => {
    cy.visit("/account");

    // Enable the label account if an earlier test hasn't already
    cy.findByRole("switch", { name: "Label/Collective account" }).then(
      ($switch) => {
        if (!$switch.is(":checked")) {
          cy.wrap($switch).click({ force: true });
          cy.findByRole("button", { name: "Update account" }).click();
          cy.findByText("Profile updated", { timeout: 5000 }).should("exist");
        }
      }
    );

    cy.findByRole("link", { name: "Manage label" }).should("exist");
  });

  describe("is label", () => {
    it("allows adding an existing artist to the label roster", () => {
      cy.visit("/account/label");

      cy.findByRole("searchbox", { name: "Invite an existing artist." }).type(
        artistName,
        { delay: 50 }
      );

      // Wait for the autocomplete dropdown to show results, then pick the artist
      cy.findByRole("button", {
        name: new RegExp(artistName),
        timeout: 5000,
      }).click();

      // Verify the artist was successfully added to the roster
      cy.findAllByText(new RegExp(artistName), { timeout: 5000 }).should(
        "exist"
      );
    });

    it("displays added artist in the roster table", () => {
      cy.visit("/account/label");

      cy.findByRole("searchbox", { name: "Invite an existing artist." }).type(
        artistName,
        { delay: 50 }
      );

      cy.findByRole("button", {
        name: new RegExp(artistName),
        timeout: 5000,
      }).click();

      cy.findAllByText(new RegExp(artistName), { timeout: 5000 })
        .first()
        .should("be.visible");
    });
  });
});
