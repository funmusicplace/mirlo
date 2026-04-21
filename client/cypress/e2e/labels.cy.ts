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

    // Find and click the label account toggle
    // Look for a label element containing "Label" text and locate the toggle switch within its parent
    cy.get("label")
      .filter((index, el) => el.textContent?.includes("Label"))
      .first()
      .should("exist")
      .parent()
      .find(".toggle")
      .should("exist")
      .click();

    // Submit the form by clicking the update button
    cy.contains("button", /update|UpdateAccountButton/i).click();

    // Verify success message appears
    cy.contains(/updated|profileUpdated/i, { timeout: 5000 }).should("exist");
  });

  it("shows manage label link after enabling label account", () => {
    cy.visit("/account");

    // Check if label account is already enabled by looking for manage label link
    cy.get("body").then(($body) => {
      if (!$body.text().includes("manageLabel")) {
        // Not enabled, so enable it
        cy.get("label")
          .filter((index, el) => el.textContent?.includes("Label"))
          .first()
          .should("exist")
          .parent()
          .find(".toggle")
          .should("exist")
          .click();

        cy.contains("button", /update|UpdateAccountButton/i).click();
        cy.contains(/updated|profileUpdated/i, { timeout: 5000 }).should(
          "exist"
        );
      }
    });

    // Verify the manage label link exists
    cy.contains("a", /manage|label|manageLabel/i).should("exist");
  });

  describe("is label", () => {
    it("allows adding an existing artist to the label roster", () => {
      cy.visit("/profile/label");

      // Type artist name in the autocomplete search field
      // The input has id="input-existing-artist"
      cy.get("#input-existing-artist").first().type(artistName, { delay: 50 });

      // Wait for the autocomplete dropdown to show results
      // The results render in a SearchResultsDiv with buttons
      cy.get("button").contains(artistName, { timeout: 5000 }).should("exist");

      // Click the artist option in the autocomplete dropdown
      cy.get("button").contains(artistName).first().click();

      // Verify the artist was successfully added to the roster
      // The artist should now appear in the roster list/table
      cy.get("body", { timeout: 5000 }).contains(artistName).should("exist");
    });

    it("displays added artist in the roster table", () => {
      // Visit the profile/label page
      cy.visit("/profile/label");

      // Search and add artist to roster
      cy.get("#input-existing-artist").first().type(artistName, { delay: 50 });

      // Wait and click the artist option
      cy.get("button").contains(artistName, { timeout: 5000 }).first().click();

      // Verify the artist is displayed in the roster
      // After being added, the artist should appear in the roster display
      cy.contains(artistName, { timeout: 5000 }).should("be.visible");
    });
  });
});
