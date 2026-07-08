/// <reference types="cypress" />

const linksEmail = "manage-links@example.com";
const linksPassword = "test1234";

describe("manage artist links", () => {
  let artistId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: linksEmail,
      password: linksPassword,
      emailConfirmationToken: null,
      name: "Links Owner",
      currency: "usd",
    })
      .then((user) => {
        const typedUser = user as { user: { id: number } };
        return cy
          .login({ email: linksEmail, password: linksPassword })
          .then(() => typedUser);
      })
      .then((user) => {
        return cy.task("createArtist", {
          userId: user.user.id,
          name: "Links Owner Artist",
          urlSlug: "links-owner-artist",
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };
        artistId = typedArtist.id;
      });
  });

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login({ email: linksEmail, password: linksPassword });
    cy.intercept("GET", "/auth/user").as("authProfile");
    cy.intercept("PUT", `/v1/manage/artists/${artistId}`).as("updateArtist");

    cy.visit(`/manage/artists/${artistId}/links`, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "nomadState",
          JSON.stringify({ cookieDisclaimerRead: true })
        );
      },
    });
    cy.wait("@authProfile");
    cy.contains("button", "Add new link").should("exist");
  });

  it("adds a new link and shows it in the list", () => {
    cy.contains("button", "Add new link").click();

    cy.contains("h2, h3, h4", "Add new link").should("be.visible");
    cy.get("#input-url").type("https://example.com");
    cy.get("#input-linkLabel").clear().type("My Site");

    cy.contains("button", "Add link").click();

    cy.wait("@updateArtist")
      .its("request.body")
      .should((body) => {
        expect(body.linksJson).to.have.length(1);
        expect(body.linksJson[0].url).to.equal("https://example.com");
        expect(body.linksJson[0].linkLabel).to.equal("My Site");
        expect(body.linksJson[0].inHeader).to.equal(true);
      });

    cy.contains("Updated links").should("be.visible");
    cy.contains("button[aria-label='Edit link']", "My Site").should("exist");
  });

  it("edits an existing link's label and persists it", () => {
    cy.contains("button", "Add new link").click();
    cy.get("#input-url").type("https://second.example");
    cy.get("#input-linkLabel").clear().type("Second");
    cy.contains("button", "Add link").click();
    cy.wait("@updateArtist");

    cy.contains("button[aria-label='Edit link']", "Second").click();
    cy.contains("h2, h3, h4", "Edit link").should("be.visible");
    cy.get("#input-linkLabel").should("have.value", "Second");
    cy.get("#input-linkLabel").clear().type("Second Updated");
    cy.contains("button", "Save link").click();

    cy.wait("@updateArtist")
      .its("request.body")
      .should((body) => {
        const updated = body.linksJson.find(
          (l: { url: string }) => l.url === "https://second.example"
        );
        expect(updated.linkLabel).to.equal("Second Updated");
      });
  });

  it("toggles inHeader off and shows the Hidden from header badge", () => {
    cy.contains("button", "Add new link").click();
    cy.get("#input-url").type("https://hidden.example");
    cy.get("#input-linkLabel").clear().type("Hidden");
    cy.contains("button", "Add link").click();
    cy.wait("@updateArtist");

    cy.contains("button[aria-label='Edit link']", "Hidden").click();
    cy.get("#inHeader").uncheck();
    cy.contains("button", "Save link").click();

    cy.wait("@updateArtist")
      .its("request.body")
      .should((body) => {
        const updated = body.linksJson.find(
          (l: { url: string }) => l.url === "https://hidden.example"
        );
        expect(updated.inHeader).to.equal(false);
      });

    cy.contains("button[aria-label='Edit link']", "Hidden")
      .parent()
      .parent()
      .contains("Hidden from header")
      .should("exist");
  });

  it("deletes a link via the edit modal", () => {
    cy.contains("button", "Add new link").click();
    cy.get("#input-url").type("https://delete-me.example");
    cy.get("#input-linkLabel").clear().type("Delete Me");
    cy.contains("button", "Add link").click();
    cy.wait("@updateArtist");

    cy.contains("button[aria-label='Edit link']", "Delete Me").click();
    cy.contains("button", "Delete link").click();

    cy.wait("@updateArtist")
      .its("request.body")
      .should((body) => {
        const present = body.linksJson.some(
          (l: { url: string }) => l.url === "https://delete-me.example"
        );
        expect(present).to.equal(false);
      });

    cy.contains("button[aria-label='Edit link']", "Delete Me").should(
      "not.exist"
    );
  });
});
