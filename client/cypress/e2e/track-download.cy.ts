/// <reference types="cypress" />

const customerEmail = "track-download-customer@example.com";
const customerPassword = "test1234";
const artistOwnerEmail = "track-download-artist@example.com";
const artistOwnerPassword = "test1234";

const artistSlug = "track-download-artist";
const albumSlug = "track-download-album";

const purchasedTrackTitle = "Purchased Track";
const unpurchasedTrackTitle = "Unpurchased Track";

const pastReleaseDate = new Date(
  Date.now() - 24 * 60 * 60 * 1000
).toISOString();

describe("single track download", () => {
  let customerId: number;
  let artistId: number;
  let trackGroupId: number;
  let purchasedTrackId: number;
  let unpurchasedTrackId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: artistOwnerEmail,
      password: artistOwnerPassword,
      emailConfirmationToken: null,
      name: "Track Download Artist Owner",
      currency: "usd",
    })
      .then((owner: any) =>
        cy.task("createArtist", {
          userId: owner.user.id,
          name: "Track Download Artist",
          urlSlug: artistSlug,
        })
      )
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createUser", {
          email: customerEmail,
          password: customerPassword,
          emailConfirmationToken: null,
          name: "Track Download Customer",
          currency: "usd",
        });
      })
      .then((customer: any) => {
        customerId = customer.user.id;
        return cy.task("createTrackGroup", {
          artistId,
          title: "Track Download Album",
          urlSlug: albumSlug,
          published: true,
          isGettable: true,
          releaseDate: pastReleaseDate,
        });
      })
      .then((tg: any) => {
        trackGroupId = tg.id;
        return cy.task("createTrack", {
          title: purchasedTrackTitle,
          urlSlug: "purchased-track",
          trackGroupId,
          allowIndividualSale: true,
        });
      })
      .then((track: any) => {
        purchasedTrackId = track.id;
        return cy.task("createTrack", {
          title: unpurchasedTrackTitle,
          urlSlug: "unpurchased-track",
          trackGroupId,
          allowIndividualSale: true,
        });
      })
      .then((track: any) => {
        unpurchasedTrackId = track.id;
        // The customer buys only the first track, not the whole album
        return cy.task("createUserTrackPurchase", {
          purchaserUserId: customerId,
          trackId: purchasedTrackId,
        });
      });
  });

  beforeEach(() => {
    cy.login({ email: customerEmail, password: customerPassword });
  });

  it("generates the track and downloads it in the chosen format", () => {
    cy.intercept("GET", `/v1/tracks/*/generate*`, {
      statusCode: 200,
      body: {
        message: "We've started generating the folder",
        result: { jobId: "43" },
      },
    }).as("generateTrack");

    cy.intercept("GET", `/v1/jobs?queue=generateAlbum*`, {
      statusCode: 200,
      body: { results: [{ jobId: "43", jobStatus: "completed" }] },
    }).as("jobStatus");

    cy.intercept("GET", `/v1/tracks/*/download*`, {
      statusCode: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": 'attachment; filename="track.zip"',
      },
      body: "",
    }).as("downloadTrack");

    cy.visit(`/${artistSlug}/release/${albumSlug}/tracks/${purchasedTrackId}`);
    cy.findByRole("button", { name: "Download", timeout: 10000 }).click();

    cy.findByRole("dialog").within(() => {
      cy.findByText("What file type do you want to download?").should(
        "be.visible"
      );
      cy.findByRole("button", { name: "FLAC" }).click();
    });

    cy.wait("@generateTrack")
      .its("request.url")
      .should("include", `/v1/tracks/${purchasedTrackId}/generate`)
      .and("include", "format=flac");
    cy.findByText(/We're generating the release!/).should("be.visible");

    cy.wait("@jobStatus", { timeout: 10000 });
    cy.findByRole("dialog")
      .findByRole("button", { name: "Download" })
      .should("be.visible")
      .click();

    cy.wait("@downloadTrack")
      .its("request.url")
      .should("include", `/v1/tracks/${purchasedTrackId}/download`)
      .and("include", "format=flac");
  });

  it("offers the download link immediately when the track zip already exists", () => {
    cy.intercept("GET", `/v1/tracks/*/generate*`, {
      statusCode: 200,
      body: { message: "The album has already been generated", result: true },
    }).as("generateTrack");

    cy.intercept("GET", `/v1/tracks/*/download*`, {
      statusCode: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": 'attachment; filename="track.zip"',
      },
      body: "",
    }).as("downloadTrack");

    cy.visit(`/${artistSlug}/release/${albumSlug}/tracks/${purchasedTrackId}`);
    cy.findByRole("button", { name: "Download", timeout: 10000 }).click();
    cy.findByRole("dialog")
      .findByRole("button", { name: "MP3 320kbps" })
      .click();

    cy.wait("@generateTrack");
    cy.findByText(/We're generating the release!/).should("not.exist");

    cy.findByRole("dialog")
      .findByRole("button", { name: "Download" })
      .should("be.visible")
      .click();

    cy.wait("@downloadTrack")
      .its("request.url")
      .should("include", `/v1/tracks/${purchasedTrackId}/download`)
      .and("include", "format=320.mp3");
  });

  it("offers a track download from the album page's track options menu", () => {
    cy.intercept("GET", `/v1/tracks/*/generate*`, {
      statusCode: 200,
      body: { message: "The album has already been generated", result: true },
    }).as("generateTrack");

    cy.visit(`/${artistSlug}/release/${albumSlug}`);

    // Track rows are unnamed list items and every row's menu button is just
    // "Track options", so scope to the list item containing the track title.
    cy.findAllByRole("listitem")
      .filter(`:contains("${purchasedTrackTitle}")`)
      .last()
      .within(() => {
        cy.findByRole("button", { name: "Track options" }).click();
      });
    cy.findByRole("button", { name: "Download" }).click();

    cy.findByRole("dialog").findByRole("button", { name: "FLAC" }).click();

    cy.wait("@generateTrack")
      .its("request.url")
      .should("include", `/v1/tracks/${purchasedTrackId}/generate`);
    cy.findByRole("dialog")
      .findByRole("button", { name: "Download" })
      .should("be.visible");
  });

  it("does not offer a download for a track the customer hasn't bought", () => {
    cy.visit(
      `/${artistSlug}/release/${albumSlug}/tracks/${unpurchasedTrackId}`
    );
    cy.findByRole("heading", { name: new RegExp(unpurchasedTrackTitle) });
    cy.findByRole("button", { name: "Download" }).should("not.exist");
  });
});
