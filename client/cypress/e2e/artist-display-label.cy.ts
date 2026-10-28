/// <reference types="cypress" />

const labelUserEmail = "display-label-owner@example.com";
const labelUserPassword = "test1234";
const labelArtistName = "Display Label";
const labelArtistSlug = "display-label-profile";

const artistUserEmail = "display-label-roster@example.com";
const artistUserPassword = "test1234";
const artistName = "Roster Artist";
const artistSlug = "display-label-roster-artist";

describe("opt-in display label on artist pages", () => {
  let labelUserId: number;
  let artistId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: labelUserEmail,
      password: labelUserPassword,
      emailConfirmationToken: null,
      name: "Display Label Owner",
      currency: "usd",
      canCreateArtists: true,
      isLabelAccount: true,
    })
      .then((labelUser: any) => {
        labelUserId = labelUser.user.id;
        return cy.task("createArtist", {
          userId: labelUserId,
          name: labelArtistName,
          urlSlug: labelArtistSlug,
          isLabelProfile: true,
        });
      })
      .then(() =>
        cy.task("createUser", {
          email: artistUserEmail,
          password: artistUserPassword,
          emailConfirmationToken: null,
          name: artistName,
          currency: "usd",
        })
      )
      .then((artistUser: any) =>
        cy.task("createArtist", {
          userId: artistUser.user.id,
          name: artistName,
          urlSlug: artistSlug,
        })
      )
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createArtistLabel", {
          artistId,
          labelUserId,
          isLabelApproved: true,
          isArtistApproved: true,
          isDisplayedOnArtistPage: false,
        });
      });
  });

  beforeEach(() => {
    cy.login({ email: artistUserEmail, password: artistUserPassword });
  });

  it("does not show the label pill on the public artist page until the artist opts in", () => {
    cy.visit(`/${artistSlug}`);

    cy.findByRole("heading", { name: artistName }).should("be.visible");
    cy.findByText(`On ${labelArtistName}`).should("not.exist");
  });

  it("lets the artist pick a label in the manage modal and persists the choice", () => {
    cy.visit(`/manage/artists/${artistId}/releases`);

    cy.findByRole("button", { name: "Add label" }).click();

    cy.findByRole("radio", { name: labelArtistName }).check();

    cy.findByRole("button", { name: "Save" }).click();

    cy.findByRole("dialog").should("not.exist");

    cy.visit(`/${artistSlug}`);
    cy.findByText(`On ${labelArtistName}`).should("be.visible");

    cy.visit(`/manage/artists/${artistId}/releases`);
    cy.findByRole("button", { name: "Edit label" }).should("be.visible");
  });

  it("hides the label pill and the manage button on mobile viewports", () => {
    cy.viewport(375, 812);

    cy.visit(`/${artistSlug}`);
    cy.findByText(`On ${labelArtistName}`).should("not.be.visible");

    cy.visit(`/manage/artists/${artistId}/releases`);
    cy.findByRole("button", { name: "Edit label" }).should("not.exist");
  });

  it("clears the label when the artist picks No label", () => {
    cy.visit(`/manage/artists/${artistId}/releases`);

    cy.findByRole("button", { name: "Edit label" }).click();

    cy.findByRole("radio", { name: "No label" }).check();

    cy.findByRole("button", { name: "Save" }).click();

    cy.findByRole("dialog").should("not.exist");

    cy.visit(`/${artistSlug}`);
    cy.findByText(`On ${labelArtistName}`).should("not.exist");

    cy.visit(`/manage/artists/${artistId}/releases`);
    cy.findByRole("button", { name: "Add label" }).should("be.visible");
  });
});
