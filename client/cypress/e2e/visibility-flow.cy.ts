/// <reference types="cypress" />

const ownerEmail = "visibility-owner@example.com";
const ownerPassword = "test1234";
const artistSlug = "visibility-test-artist";

describe("visibility flow", () => {
  let ownerId: number;
  let artistId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: ownerEmail,
      password: ownerPassword,
      emailConfirmationToken: null,
      name: "Visibility Artist Owner",
      currency: "usd",
    })
      .then((owner: any) => {
        ownerId = owner.user.id;
        return cy.task("createArtist", {
          userId: owner.user.id,
          name: "Visibility Test Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
      });
  });

  describe("draft album: publish as private", () => {
    let trackGroupId: number;

    before(() => {
      cy.task("createTrackGroup", {
        artistId,
        title: "Publish As Private Album",
        urlSlug: "publish-as-private-album",
        publishedAt: null,
        isGettable: true,
        minPrice: 500,
      }).then((tg: any) => {
        trackGroupId = tg.id;
      });
    });

    beforeEach(() => {
      cy.login({ email: ownerEmail, password: ownerPassword });
      cy.intercept("GET", "/auth/profile").as("authProfile");
      cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}`).as(
        "updateTrackGroup"
      );
      cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}/publish`).as(
        "publishTrackGroup"
      );
    });

    it("shows 'Publish as' legend with Public and Private radios on draft", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.contains("Publish as").should("exist");
      cy.get("#input-visibility-public").should("exist").and("be.checked");
      cy.get("#input-visibility-private").should("exist").and("not.be.checked");
    });

    it("flipping radio Private does not auto-save", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.get("#input-visibility-private").check({ force: true });

      cy.wait(500);
      cy.get("@updateTrackGroup.all").should("have.length", 0);
    });

    it("publishing as private commits isPublic=false then publishes", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.get("#input-visibility-private").check({ force: true });
      cy.contains("Publish release").click();

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.isPublic).to.equal(false);
        });

      cy.wait("@publishTrackGroup")
        .its("response.statusCode")
        .should("equal", 200);
    });
  });

  describe("published-private album: flip to public via Update release", () => {
    let trackGroupId: number;

    before(() => {
      cy.task("createTrackGroup", {
        artistId,
        title: "Flip To Public Album",
        urlSlug: "flip-to-public-album",
        isGettable: true,
        minPrice: 500,
        isPublic: false,
      }).then((tg: any) => {
        trackGroupId = tg.id;
      });
    });

    beforeEach(() => {
      cy.login({ email: ownerEmail, password: ownerPassword });
      cy.intercept("GET", "/auth/profile").as("authProfile");
      cy.intercept("PUT", `/v1/manage/trackGroups/${trackGroupId}`).as(
        "updateTrackGroup"
      );
    });

    it("shows 'Visibility' legend (published variant) with Private checked", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.contains("Visibility").should("exist");
      cy.get("#input-visibility-private").should("be.checked");
      cy.get("#input-visibility-public").should("not.be.checked");
    });

    it("flipping radio Public then Update release commits isPublic=true", () => {
      cy.visit(`/manage/artists/${artistId}/release-flow-2/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.get("#input-visibility-public").check({ force: true });

      cy.wait(500);
      cy.get("@updateTrackGroup.all").should("have.length", 0);

      cy.contains("Update release").click();

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.isPublic).to.equal(true);
        });
    });
  });
});
