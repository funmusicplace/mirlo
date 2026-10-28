/// <reference types="cypress" />

const ownerEmail = "schedule-owner@example.com";
const ownerPassword = "test1234";
const artistSlug = "schedule-test-artist";

const futureDateString = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
})();

describe("schedule publication flow", () => {
  let ownerId: number;
  let artistId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: ownerEmail,
      password: ownerPassword,
      emailConfirmationToken: null,
      name: "Schedule Artist Owner",
      currency: "usd",
    })
      .then((owner: any) => {
        ownerId = owner.user.id;
        return cy.task("createArtist", {
          userId: owner.user.id,
          name: "Schedule Test Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
      });
  });

  describe("draft album with no publication date", () => {
    let trackGroupId: number;

    before(() => {
      cy.task("createTrackGroup", {
        artistId,
        title: "Schedulable Draft Album",
        urlSlug: "schedulable-draft-album",
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
    });

    it("disables the Schedule confirm button when no date is selected", () => {
      cy.visit(`/manage/artists/${artistId}/release/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.findAllByRole("button", { name: "Schedule publication date" })
        .first()
        .click();
      cy.findByRole("dialog")
        .findByRole("button", { name: "Schedule" })
        .should("be.disabled");
    });

    it("schedules a publication date and shows the confirmation label", () => {
      cy.visit(`/manage/artists/${artistId}/release/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.findAllByRole("button", { name: "Schedule publication date" })
        .first()
        .click();

      cy.findByLabelText("Publication date")
        .should("exist")
        .type(futureDateString);

      cy.findByRole("dialog")
        .findByRole("button", { name: "Schedule" })
        .click();

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.publishedAt).to.be.a("string");
          expect(body.publishedAt.startsWith(futureDateString)).to.equal(true);
        });

      cy.findAllByText(/Will be published automatically on/).should("exist");
    });
  });

  describe("draft album already scheduled", () => {
    let trackGroupId: number;

    before(() => {
      cy.task("createTrackGroup", {
        artistId,
        title: "Already Scheduled Album",
        urlSlug: "already-scheduled-album",
        publishedAt: new Date(futureDateString).toISOString(),
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
    });

    it("cancels a scheduled publication and restores the link", () => {
      cy.visit(`/manage/artists/${artistId}/release/${trackGroupId}`);
      cy.wait("@authProfile");

      cy.findAllByText(/Will be published automatically on/).should("exist");
      cy.findAllByRole("button", { name: "Cancel scheduled publication" })
        .first()
        .click();

      cy.findByRole("button", { name: "Yes, cancel schedule" }).click();

      cy.wait("@updateTrackGroup")
        .its("request.body")
        .should((body) => {
          expect(body.publishedAt).to.equal(null);
        });

      cy.findAllByRole("button", { name: "Schedule publication date" }).should(
        "exist"
      );
    });
  });
});
