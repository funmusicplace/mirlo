/// <reference types="cypress" />

const customerEmail = "zip-download-customer@example.com";
const customerPassword = "test1234";
const artistOwnerEmail = "zip-download-artist@example.com";
const artistOwnerPassword = "test1234";

const artistSlug = "zip-download-artist";
const albumSlug = "zip-download-album";

const pastReleaseDate = new Date(
  Date.now() - 24 * 60 * 60 * 1000
).toISOString();

describe("album zip generation and download", () => {
  let customerId: number;
  let artistId: number;
  let trackGroupId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: artistOwnerEmail,
      password: artistOwnerPassword,
      emailConfirmationToken: null,
      name: "Zip Download Artist Owner",
      currency: "usd",
    })
      .then((owner: any) =>
        cy.task("createArtist", {
          userId: owner.user.id,
          name: "Zip Download Artist",
          urlSlug: artistSlug,
        })
      )
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createUser", {
          email: customerEmail,
          password: customerPassword,
          emailConfirmationToken: null,
          name: "Zip Download Customer",
          currency: "usd",
        });
      })
      .then((customer: any) => {
        customerId = customer.user.id;
        return cy.task("createTrackGroup", {
          artistId,
          title: "Zip Download Album",
          urlSlug: albumSlug,
          published: true,
          isGettable: true,
          releaseDate: pastReleaseDate,
        });
      })
      .then((tg: any) => {
        trackGroupId = tg.id;
        return cy.task("createUserTrackGroupPurchase", {
          purchaserUserId: customerId,
          trackGroupId,
        });
      });
  });

  beforeEach(() => {
    cy.login({ email: customerEmail, password: customerPassword });
  });

  it("shows a loading state then a download link after zip generation completes", () => {
    cy.intercept("GET", `/v1/trackGroups/*/generate*`, {
      statusCode: 200,
      body: {
        message: "We've started generating the album",
        result: { jobId: "42" },
      },
    }).as("generateAlbum");

    cy.intercept("GET", `/v1/jobs?queue=generateAlbum*`, {
      statusCode: 200,
      body: { results: [{ jobId: "42", jobStatus: "completed" }] },
    }).as("jobStatus");

    cy.visit(`/${artistSlug}/release/${albumSlug}`);
    cy.get('[data-testid="download-button"]').click();

    cy.contains("What file type do you want to download?").should("be.visible");
    cy.get('[role="dialog"]').contains("button", "FLAC").click();

    cy.wait("@generateAlbum");
    cy.contains("We're generating the release!").should("be.visible");

    cy.wait("@jobStatus", { timeout: 10000 });
    cy.get('[role="dialog"]').contains("a", "Download").should("be.visible");
  });

  it("shows the download link immediately when the zip already exists", () => {
    cy.intercept("GET", `/v1/trackGroups/*/generate*`, {
      statusCode: 200,
      body: {
        message: "The album has already been generated",
        result: true,
      },
    }).as("generateAlbum");

    cy.visit(`/${artistSlug}/release/${albumSlug}`);
    cy.get('[data-testid="download-button"]').click();
    cy.get('[role="dialog"]').contains("button", "FLAC").click();

    cy.wait("@generateAlbum");
    cy.contains("We're generating the release!").should("not.exist");
    cy.get('[role="dialog"]').contains("a", "Download").should("be.visible");
  });

  it("download link points to the correct endpoint with the chosen format", () => {
    cy.intercept("GET", `/v1/trackGroups/*/generate*`, {
      statusCode: 200,
      body: { message: "The album has already been generated", result: true },
    }).as("generateAlbum");

    cy.visit(`/${artistSlug}/release/${albumSlug}`);
    cy.get('[data-testid="download-button"]').click();
    cy.get('[role="dialog"]').contains("button", "MP3 320kbps").click();

    cy.wait("@generateAlbum");
    cy.get('[role="dialog"]')
      .contains("a", "Download")
      .should("be.visible")
      .should("have.attr", "href")
      .and("include", "/download")
      .and("include", "format=320.mp3");
  });

  it("choosing another format resets to the format selection screen", () => {
    cy.intercept("GET", `/v1/trackGroups/*/generate*`, {
      statusCode: 200,
      body: { message: "The album has already been generated", result: true },
    }).as("generateAlbum");

    cy.visit(`/${artistSlug}/release/${albumSlug}`);
    cy.get('[data-testid="download-button"]').click();
    cy.get('[role="dialog"]').contains("button", "FLAC").click();

    cy.wait("@generateAlbum");
    cy.get('[role="dialog"]').contains("a", "Download").should("be.visible");

    cy.get('[role="dialog"]')
      .contains("button", "Choose another format")
      .click();
    cy.contains("What file type do you want to download?").should("be.visible");
  });
});
