/// <reference types="cypress" />

const userEmail = "fediverse-mentions@example.com";
const userPassword = "test1234";
const urlSlug = "fediverse-mentions-artist";
const mentionUrl = "https://mastodon.example/@mentioner/1";

describe("fediverse mentions", () => {
  let artistId: number;
  let userId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: userEmail,
      password: userPassword,
      emailConfirmationToken: null,
      name: "Fediverse Mentions Owner",
      currency: "usd",
    })
      .then((result) => {
        userId = (result as { user: { id: number } }).user.id;
        return cy.task("createArtist", {
          userId,
          name: "Fediverse Mentions Artist",
          urlSlug,
          activityPub: true,
        });
      })
      .then((artist) => {
        artistId = (artist as { id: number }).id;
      });
  });

  beforeEach(() => {
    cy.login({ email: userEmail, password: userPassword });
  });

  describe("in the activity feed", () => {
    const createMention = (content: string, statusId: string) =>
      cy.task("createNotification", {
        userId,
        artistId,
        notificationType: "AP_MENTION",
        content,
        metadata: {
          ap: {
            actor: "https://mastodon.example/users/mentioner",
            actorName: "Mentioner",
            actorHandle: "@mentioner@mastodon.example",
            objectId: `https://mastodon.example/users/mentioner/statuses/${statusId}`,
            url: mentionUrl,
          },
        },
      });

    before(() => {
      createMention("@artist loved the new record", "1");
      cy.task("createUser", {
        email: "fediverse-mentions-follower@example.com",
        name: "Fediverse Follower",
      }).then((result) => {
        cy.task("createNotification", {
          userId,
          artistId,
          notificationType: "USER_FOLLOWED_YOU",
          relatedUserId: (result as { user: { id: number } }).user.id,
        });
      });
    });

    beforeEach(() => {
      cy.intercept("GET", /\/v1\/users\/\d+\/notifications\?/).as(
        "fetchNotifications"
      );
      cy.intercept("DELETE", /\/v1\/users\/\d+\/notifications\/[\w-]+$/).as(
        "removeNotification"
      );
      cy.visit("/profile/notifications");
      cy.wait("@fetchNotifications");
    });

    it("shows the mention with a link to the original post", () => {
      cy.get("#activity-column").within(() => {
        cy.contains("mentioned you on the fediverse").should("exist");
        cy.contains("Mentioner").should("exist");
        cy.contains("@mentioner@mastodon.example").should("exist");
        cy.contains("@artist loved the new record").should("exist");
        cy.get('a[aria-label="View post (opens in a new tab)"]')
          .should("have.attr", "href", mentionUrl)
          .and("have.attr", "target", "_blank");
      });
    });

    it("filters the activity column down to fediverse mentions", () => {
      cy.get("#activity-column").within(() => {
        cy.contains("Fediverse Follower").should("exist");
        cy.contains("label", "Fediverse").click();
        cy.contains("@artist loved the new record").should("exist");
        cy.contains("Fediverse Follower").should("not.exist");
      });
    });

    it("removes the mention from the feed", () => {
      const removedContent = "@artist this one will be removed";
      createMention(removedContent, "2");
      cy.visit("/profile/notifications");
      cy.wait("@fetchNotifications");

      cy.get("#activity-column")
        .contains("li", removedContent)
        .within(() => {
          cy.contains("button", "Remove").click();
        });
      cy.wait("@removeNotification")
        .its("response.statusCode")
        .should("eq", 200);
      cy.contains("Mention removed.").should("exist");
      cy.get("#activity-column").contains(removedContent).should("not.exist");
      cy.get("#activity-column")
        .contains("@artist loved the new record")
        .should("exist");
    });
  });

  describe("on the customize page", () => {
    beforeEach(() => {
      cy.intercept("GET", "/auth/profile").as("authProfile");
      cy.intercept("GET", `/v1/manage/artists/${artistId}*`).as(
        "getManagedArtist"
      );
      cy.intercept("PUT", `/v1/manage/artists/${artistId}`).as("updateArtist");
      cy.visit(`/manage/artists/${artistId}/customize`);
      cy.wait("@authProfile");
      cy.wait("@getManagedArtist");
    });

    it("saves the fediverse mentions toggle and keeps it after reload", () => {
      cy.get("#input-allow-fediverse-mentions").should("be.checked");
      cy.get("#input-allow-fediverse-mentions").uncheck({ force: true });
      cy.contains("button", "Save changes").click();
      cy.wait("@updateArtist")
        .its("request.body.allowFediverseMentions")
        .should("eq", false);

      cy.reload();
      cy.wait("@getManagedArtist");
      cy.get("#input-allow-fediverse-mentions").should("not.be.checked");
    });
  });
});
