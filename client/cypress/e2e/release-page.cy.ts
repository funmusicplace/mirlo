/// <reference types="cypress" />

const artistName = "Release Page Artist";
const artistSlug = "release-page-artist";
const otherArtistName = "Recommended Artist";
const otherArtistSlug = "recommended-artist";
const loneArtistName = "Lone Artist";
const loneArtistSlug = "lone-artist";

const mainAlbum = { title: "Main Album", urlSlug: "main-album" };
const otherAlbum = { title: "Other Album", urlSlug: "other-album" };
const recommendedAlbum = {
  title: "Recommended Album",
  urlSlug: "recommended-album",
};
const loneAlbum = { title: "Lone Album", urlSlug: "lone-album" };

const pastReleaseDate = new Date(
  Date.now() - 24 * 60 * 60 * 1000
).toISOString();

const createArtistWithOwner = (email: string, name: string, slug: string) =>
  cy
    .task("createUser", {
      email,
      password: "test1234",
      emailConfirmationToken: null,
      name: `${name} Owner`,
      currency: "usd",
    })
    .then((owner: any) =>
      cy.task("createArtist", {
        userId: owner.user.id,
        name,
        urlSlug: slug,
      })
    );

describe("release page", () => {
  before(() => {
    cy.task("clearTables");

    let artistId: number;
    let mainAlbumId: number;

    createArtistWithOwner(
      "release-page-artist@example.com",
      artistName,
      artistSlug
    )
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createTrackGroup", {
          artistId,
          ...mainAlbum,
          published: true,
          releaseDate: pastReleaseDate,
          about: "Recorded over one winter by the sea.",
          credits: "Mixed by Haru Ito",
          coverCredit: "Mira Holt",
        });
      })
      .then((tg: any) => {
        mainAlbumId = tg.id;
        return cy.task("createTrackGroup", {
          artistId,
          ...otherAlbum,
          published: true,
          releaseDate: pastReleaseDate,
        });
      })
      .then(() =>
        createArtistWithOwner(
          "recommended-artist@example.com",
          otherArtistName,
          otherArtistSlug
        )
      )
      .then((otherArtist: any) =>
        cy.task("createTrackGroup", {
          artistId: otherArtist.id,
          ...recommendedAlbum,
          published: true,
          releaseDate: pastReleaseDate,
        })
      )
      .then((recommended: any) =>
        cy.task("createRecommendedTrackGroup", {
          trackGroupId: mainAlbumId,
          recommendedTrackGroupId: recommended.id,
        })
      )
      .then(() =>
        createArtistWithOwner(
          "lone-artist@example.com",
          loneArtistName,
          loneArtistSlug
        )
      )
      .then((loneArtist: any) =>
        cy.task("createTrackGroup", {
          artistId: loneArtist.id,
          ...loneAlbum,
          published: true,
          releaseDate: pastReleaseDate,
        })
      );
  });

  it("shows credits with release date, track count and cover credit, next to the about text", () => {
    cy.visit(`/${artistSlug}/release/${mainAlbum.urlSlug}`);

    cy.findByRole("heading", { name: "Credits", timeout: 10000 }).should(
      "be.visible"
    );
    cy.findByText(/Released on/).should("be.visible");
    cy.findByText("1 track").should("be.visible");
    cy.findByText("Cover art: Mira Holt").should("be.visible");
    cy.findByText("Mixed by Haru Ito").should("be.visible");

    cy.findByRole("heading", { name: "About" }).should("be.visible");
    cy.findByText("Recorded over one winter by the sea.").should("be.visible");
  });

  it("lists recommendations as links to their release page, without playback controls", () => {
    cy.visit(`/${artistSlug}/release/${mainAlbum.urlSlug}`);

    cy.findByRole("region", {
      name: `${artistName} recommends`,
      timeout: 10000,
    }).within(() => {
      cy.findByRole("link", { name: new RegExp(recommendedAlbum.title) })
        .should("have.attr", "href")
        .and(
          "include",
          `/${otherArtistSlug}/release/${recommendedAlbum.urlSlug}`
        );
      cy.findByText(otherArtistName).should("be.visible");
      cy.findByRole("button", { name: /play/i }).should("not.exist");
    });
  });

  it("shows the artist block with follow and the artist's other releases", () => {
    cy.visit(`/${artistSlug}/release/${mainAlbum.urlSlug}`);

    cy.findByRole("button", { name: "Follow", timeout: 10000 }).should(
      "be.visible"
    );

    cy.findByRole("region", {
      name: `Other releases by ${artistName}`,
    }).within(() => {
      cy.findByRole("link", { name: new RegExp(otherAlbum.title) }).should(
        "have.attr",
        "href"
      );
      cy.findByRole("link", { name: new RegExp(mainAlbum.title) }).should(
        "not.exist"
      );
      cy.findByRole("link", { name: `See all releases by ${artistName}` })
        .should("have.attr", "href")
        .and("include", `/${artistSlug}/releases`);
    });
  });

  it("hides recommendations, other releases and the credits heading when there is nothing to show", () => {
    cy.visit(`/${loneArtistSlug}/release/${loneAlbum.urlSlug}`);

    cy.findByRole("button", { name: "Follow", timeout: 10000 }).should(
      "be.visible"
    );
    cy.findByText("1 track").should("be.visible");

    cy.findByRole("heading", { name: "Credits" }).should("not.exist");
    cy.findByRole("heading", { name: "About" }).should("not.exist");
    cy.findByRole("region", { name: `${loneArtistName} recommends` }).should(
      "not.exist"
    );
    cy.findByRole("region", {
      name: `Other releases by ${loneArtistName}`,
    }).should("not.exist");
  });
});
