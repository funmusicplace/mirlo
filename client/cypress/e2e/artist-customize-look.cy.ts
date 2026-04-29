/// <reference types="cypress" />

const userEmail = "customize-look-admin@example.com";
const userPassword = "test1234";
const urlSlug = "customize-look-artist";

describe("artist customize look", () => {
  let artistId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: userEmail,
      password: userPassword,
      emailConfirmationToken: null,
      name: "Customize Look Admin",
      currency: "usd",
    })
      .then((user) => {
        const typedUser = user as { user: { id: number } };
        return cy.task("createArtist", {
          userId: typedUser.user.id,
          name: "Customize Look Artist",
          urlSlug,
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };
        artistId = typedArtist.id;
      });
  });

  beforeEach(() => {
    cy.login({ email: userEmail, password: userPassword });

    cy.intercept("GET", "/auth/profile").as("authProfile");
    cy.intercept("PUT", `/v1/manage/artists/${artistId}`).as("updateArtist");
    cy.intercept("GET", `/v1/artists/${urlSlug}*`).as("getArtist");

    cy.visit(`/manage/artists/${artistId}/customize`);
    cy.wait("@authProfile");
  });

  it("toggles transparent container and persists it to artist properties", () => {
    cy.get("#input-transparent-container").check();
    cy.contains("button", "Save colors").click();
    cy.wait("@updateArtist")
      .its("request.body.properties.transparentContainer")
      .should("eq", true);

    cy.visit(`/${urlSlug}`);
    cy.wait("@getArtist");
    cy.get("#artist-colors-root").should("have.class", "transparent-container");
  });

  it("updates the artist colors live in the page when the form changes without saving", () => {
    cy.get('[id="input-color-properties.colors.background"]').then(($input) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )!.set!;
      nativeInputValueSetter.call($input[0], "#ff00ff");
      $input[0].dispatchEvent(new Event("input", { bubbles: true }));
    });

    cy.get("#artist-colors-root")
      .should("have.attr", "style")
      .and("match", /--mi-background-color:\s*#ff00ff/i);
  });
});
