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
    cy.intercept("GET", "/auth/profile").as("authProfile");
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
    cy.findByRole("button", { name: "Add new link" }).should("exist");
  });

  it("adds a new link and shows it in the list", () => {
    cy.findByRole("button", { name: "Add new link" }).click();

    cy.findByRole("heading", { name: "Add new link" }).should("be.visible");
    cy.findByRole("textbox", { name: "URL" }).type("https://example.com");
    cy.findByRole("textbox", { name: "Name of linked website" })
      .clear()
      .type("My Site");

    cy.findByRole("button", { name: "Add link" }).click();

    cy.wait("@updateArtist")
      .its("request.body")
      .should((body) => {
        expect(body.linksJson).to.have.length(1);
        expect(body.linksJson[0].url).to.equal("https://example.com");
        expect(body.linksJson[0].linkLabel).to.equal("My Site");
        expect(body.linksJson[0].inHeader).to.equal(true);
      });

    cy.findByText("Updated links").should("be.visible");
    cy.findByRole("button", { name: "Edit link My Site" }).should("exist");
  });

  it("edits an existing link's label and persists it", () => {
    cy.findByRole("button", { name: "Add new link" }).click();
    cy.findByRole("textbox", { name: "URL" }).type("https://second.example");
    cy.findByRole("textbox", { name: "Name of linked website" })
      .clear()
      .type("Second");
    cy.findByRole("button", { name: "Add link" }).click();
    cy.wait("@updateArtist");

    cy.findByRole("button", { name: "Edit link Second" }).click();
    cy.findByRole("heading", { name: "Edit link" }).should("be.visible");
    cy.findByRole("textbox", { name: "Name of linked website" }).should(
      "have.value",
      "Second"
    );
    cy.findByRole("textbox", { name: "Name of linked website" })
      .clear()
      .type("Second Updated");
    cy.findByRole("button", { name: "Save link" }).click();

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
    cy.findByRole("button", { name: "Add new link" }).click();
    cy.findByRole("textbox", { name: "URL" }).type("https://hidden.example");
    cy.findByRole("textbox", { name: "Name of linked website" })
      .clear()
      .type("Hidden");
    cy.findByRole("button", { name: "Add link" }).click();
    cy.wait("@updateArtist");

    cy.findByRole("button", { name: "Edit link Hidden" }).click();
    cy.findByRole("checkbox", {
      name: "Include this link in your artist header",
    }).uncheck();
    cy.findByRole("button", { name: "Save link" }).click();

    cy.wait("@updateArtist")
      .its("request.body")
      .should((body) => {
        const updated = body.linksJson.find(
          (l: { url: string }) => l.url === "https://hidden.example"
        );
        expect(updated.inHeader).to.equal(false);
      });

    cy.findByRole("button", { name: "Edit link Hidden" })
      .findByText("Hidden from header")
      .should("exist");
  });

  it("deletes a link via the edit modal", () => {
    cy.findByRole("button", { name: "Add new link" }).click();
    cy.findByRole("textbox", { name: "URL" }).type("https://delete-me.example");
    cy.findByRole("textbox", { name: "Name of linked website" })
      .clear()
      .type("Delete Me");
    cy.findByRole("button", { name: "Add link" }).click();
    cy.wait("@updateArtist");

    cy.findByRole("button", { name: "Edit link Delete Me" }).click();
    cy.findByRole("button", { name: "Delete link" }).click();

    cy.wait("@updateArtist")
      .its("request.body")
      .should((body) => {
        const present = body.linksJson.some(
          (l: { url: string }) => l.url === "https://delete-me.example"
        );
        expect(present).to.equal(false);
      });

    cy.findByRole("button", { name: "Edit link Delete Me" }).should(
      "not.exist"
    );
  });
});
