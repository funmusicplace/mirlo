/// <reference types="cypress" />

const explicitSaveEmail = "explicit-save-admin@example.com";
const explicitSavePassword = "test1234";

describe("manage album explicit save", () => {
  let artistId: number;
  let trackGroupId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: explicitSaveEmail,
      password: explicitSavePassword,
      emailConfirmationToken: null,
      name: "Explicit Save Admin",
      currency: "usd",
    })
      .then((user) => {
        const typedUser = user as { user: { id: number } };
        return cy
          .login({ email: explicitSaveEmail, password: explicitSavePassword })
          .then(() => typedUser);
      })
      .then((user) => {
        return cy.task("createArtist", {
          userId: user.user.id,
          name: "Explicit Save Artist",
          urlSlug: "explicit-save-artist",
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };
        artistId = typedArtist.id;
        return cy.task("createTrackGroup", {
          artistId,
          title: "Original Album Title",
          urlSlug: "original-album",
          minPrice: 500,
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
    cy.login({ email: explicitSaveEmail, password: explicitSavePassword });
    cy.intercept("GET", "/auth/user").as("authProfile");
    cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}`).as(
      "updateTrackGroup"
    );

    cy.visit(`/manage/artists/${artistId}/release/${trackGroupId}`);
    cy.wait("@authProfile");
    cy.contains("h2", "Key details").should("exist");
  });

  describe("Save draft button", () => {
    it("is disabled when nothing has changed", () => {
      cy.contains("button", "Save draft").should("be.disabled");
    });

    it("becomes enabled as soon as any field changes", () => {
      cy.get("#input-title").clear().type("Updated Title");
      cy.contains("button", "Save draft").should("not.be.disabled");
    });

    it("commits all dirty fields in a single PUT and goes back to disabled", () => {
      cy.get("#input-title").clear().type("Brand New Title");
      cy.get("#input-about").clear().type("A fresh description");
      cy.get("#input-minimum-price").clear().type("12");
      cy.get("#input-catalog-number").clear().type("CAT-042");

      cy.contains("button", "Save draft").should("not.be.disabled").click();

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.title).to.equal("Brand New Title");
          expect(body.about).to.equal("A fresh description");
          expect(body.minPrice).to.equal(1200);
          expect(body.catalogNumber).to.equal("CAT-042");
        });

      cy.contains("button", "Save draft").should("be.disabled");
    });

    it("only fires once per click even with multiple dirty fields", () => {
      cy.get("#input-title").clear().type("Single PUT Title");
      cy.get("#input-about").clear().type("Single PUT about");

      cy.contains("button", "Save draft").click();
      cy.wait("@updateTrackGroup");

      cy.wait(500);
      cy.get("@updateTrackGroup.all").should("have.length", 1);
    });
  });

  describe("local draft restoration", () => {
    it("restores unsaved changes from local storage on reload", () => {
      const draftTitle = "Local Draft Title";
      cy.get("#input-title").clear().type(draftTitle);

      cy.wait(700);

      cy.reload();
      cy.wait("@authProfile");

      cy.contains("Some unsaved changes have been restored").should(
        "be.visible"
      );
      cy.get("#input-title").should("have.value", draftTitle);
      cy.contains("button", "Save draft").should("not.be.disabled");
    });

    it("Discard reverts to server values and clears the banner", () => {
      cy.get("#input-title")
        .invoke("val")
        .then((serverTitle) => {
          cy.get("#input-title").clear().type("To Be Discarded");
          cy.wait(700);

          cy.reload();
          cy.wait("@authProfile");

          cy.contains("Some unsaved changes have been restored").should(
            "be.visible"
          );
          cy.contains("button", "Discard").click();

          cy.contains("Some unsaved changes have been restored").should(
            "not.exist"
          );
          cy.get("#input-title").should("have.value", serverTitle as string);
          cy.contains("button", "Save draft").should("be.disabled");
        });
    });

    it("Keep dismisses the banner without touching the form", () => {
      const draftTitle = "Kept Draft Title";
      cy.get("#input-title").clear().type(draftTitle);
      cy.wait(700);

      cy.reload();
      cy.wait("@authProfile");

      cy.contains("Some unsaved changes have been restored").should(
        "be.visible"
      );
      cy.contains("button", "Keep").click();

      cy.contains("Some unsaved changes have been restored").should(
        "not.exist"
      );
      cy.get("#input-title").should("have.value", draftTitle);
      cy.contains("button", "Save draft").should("not.be.disabled");
    });

    it("Save draft clears the local storage so no banner on reload", () => {
      cy.get("#input-title").clear().type("Saved Through Draft");
      cy.wait(700);

      cy.contains("button", "Save draft").click();
      cy.wait("@updateTrackGroup");

      cy.reload();
      cy.wait("@authProfile");

      cy.contains("Some unsaved changes have been restored").should(
        "not.exist"
      );
      cy.get("#input-title").should("have.value", "Saved Through Draft");
    });
  });
});
