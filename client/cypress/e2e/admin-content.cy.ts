/// <reference types="cypress" />

const adminUserEmail = "admin@admin.example";
const adminPassword = "test1234";

describe("admin content pages", () => {
  let artistId: number;
  let trackGroupId: number;
  let trackId: number;
  let userId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: adminUserEmail,
      password: adminPassword,
      emailConfirmationToken: null,
      name: "Jim",
      isAdmin: true,
    })
      .then((user: any) => {
        userId = user.user.id;
        return cy.task("createArtist", {
          userId,
          name: "Example Artist",
          urlSlug: "example-artist",
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createTrackGroup", {
          title: "Example Album",
          urlSlug: "example-album",
          artistId: artist.id,
        });
      })
      .then((trackGroup: any) => {
        trackGroupId = trackGroup.id;
        return cy.task("createTrack", {
          title: "Example Track",
          urlSlug: "example-track",
          trackGroupId: trackGroup.id,
        });
      })
      .then((track: any) => {
        trackId = track.id;
      });
  });

  beforeEach(() => {
    cy.intercept("GET", "/auth/profile").as("authProfile");

    cy.login({ email: adminUserEmail, password: adminPassword });
  });

  it("renders the content nav and links to each section", () => {
    cy.visit("/admin/content");
    cy.wait(["@authProfile"]);

    cy.contains("a", "Trackgroups (releases)").should(
      "have.attr",
      "href",
      "/admin/content/track-groups"
    );
    cy.contains("a", "Artists").should(
      "have.attr",
      "href",
      "/admin/content/artists"
    );
    cy.contains("a", "Users").should(
      "have.attr",
      "href",
      "/admin/content/users"
    );
    cy.contains("a", "Tracks").should(
      "have.attr",
      "href",
      "/admin/content/tracks"
    );
  });

  it("renders the track groups list", () => {
    cy.visit("/admin/content/track-groups");
    cy.wait(["@authProfile"]);

    cy.contains("Example Album", { timeout: 10000 });
  });

  it("renders a track group's detail page", () => {
    cy.visit(`/admin/content/track-groups/${trackGroupId}`);
    cy.wait(["@authProfile"]);

    cy.contains("Example Album");
  });

  it("renders the artists list", () => {
    cy.visit("/admin/content/artists");
    cy.wait(["@authProfile"]);

    cy.contains("Example Artist", { timeout: 10000 });
  });

  it("renders an artist's detail page", () => {
    cy.visit(`/admin/content/artists/${artistId}`);
    cy.wait(["@authProfile"]);

    cy.contains("Example Artist");
  });

  it("renders the users list", () => {
    cy.visit("/admin/content/users");
    cy.wait(["@authProfile"]);

    cy.contains(adminUserEmail, { timeout: 10000 });
  });

  it("renders a user's detail page", () => {
    cy.visit(`/admin/content/users/${userId}`);
    cy.wait(["@authProfile"]);

    cy.contains(adminUserEmail, { timeout: 10000 });
  });

  it("renders the tracks list", () => {
    cy.visit("/admin/content/tracks");
    cy.wait(["@authProfile"]);

    cy.contains("Example Track", { timeout: 10000 });
  });
});
