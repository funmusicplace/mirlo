/// <reference types="cypress" />

const ownerEmail = "post-owner@example.com";
const ownerPassword = "test1234";
const subscriberEmail = "post-subscriber@example.com";
const subscriberPassword = "test1234";
const nonSubscriberEmail = "post-non-subscriber@example.com";
const nonSubscriberPassword = "test1234";
const artistSlug = "post-visibility-artist";

const PUBLIC_CONTENT =
  "<p>This is public content that everyone should be able to read.</p>";
const SUBSCRIBER_CONTENT =
  "<p>This is exclusive content only for paying subscribers.</p>";

describe("blog post subscriber visibility", () => {
  let artistId: number;
  let tierId: number;
  let subscriberId: number;
  let nonSubscriberId: number;

  before(() => {
    cy.task("clearTables");

    // Create owner
    cy.task("createUser", {
      email: ownerEmail,
      password: ownerPassword,
      emailConfirmationToken: null,
      name: "Post Visibility Owner",
      currency: "usd",
    })
      .then((owner: any) => {
        // Create subscriber
        return cy
          .task("createUser", {
            email: subscriberEmail,
            password: subscriberPassword,
            emailConfirmationToken: null,
            name: "Post Subscriber",
            currency: "usd",
          })
          .then((subscriber: any) => {
            subscriberId = subscriber.user.id;
            // Create non-subscriber
            return cy
              .task("createUser", {
                email: nonSubscriberEmail,
                password: nonSubscriberPassword,
                emailConfirmationToken: null,
                name: "Post Non-Subscriber",
                currency: "usd",
              })
              .then((nonSubscriber: any) => {
                nonSubscriberId = nonSubscriber.user.id;
                return owner;
              });
          });
      })
      .then((owner: any) => {
        return cy.task("createArtist", {
          userId: owner.user.id,
          name: "Post Visibility Artist",
          urlSlug: artistSlug,
        });
      })
      .then((artist: any) => {
        artistId = artist.id;
        return cy.task("createTier", {
          artistId,
          name: "Supporter",
          minAmount: 500,
        });
      })
      .then((tier: any) => {
        tierId = tier.id;
        // Subscribe the subscriber user to this tier
        return cy.task("createSubscription", {
          userId: subscriberId,
          tierId,
          amount: 500,
        });
      });
  });

  describe("public post (created via task)", () => {
    let publicPostId: number;

    before(() => {
      cy.task("createPost", {
        artistId,
        title: "A Public Post",
        urlSlug: "a-public-post",
        content: PUBLIC_CONTENT,
        isPublic: true,
        isDraft: false,
        publishedAt: new Date("2025-01-01").toISOString(),
      }).then((post: any) => {
        publicPostId = post.id;
      });
    });

    it("is visible to a non-subscriber", () => {
      cy.login({ email: nonSubscriberEmail, password: nonSubscriberPassword });
      cy.visit(`/${artistSlug}/posts/${publicPostId}/`);
      cy.contains(
        "This is public content that everyone should be able to read."
      ).should("exist");
      cy.contains("This post is for subscribers only.").should("not.exist");
    });

    it("is visible to a subscriber", () => {
      cy.login({ email: subscriberEmail, password: subscriberPassword });
      cy.visit(`/${artistSlug}/posts/${publicPostId}/`);
      cy.contains(
        "This is public content that everyone should be able to read."
      ).should("exist");
      cy.contains("This post is for subscribers only.").should("not.exist");
    });
  });

  describe("subscriber-only post (created via manage UI)", () => {
    let subscriberPostId: number;

    before(() => {
      cy.login({ email: ownerEmail, password: ownerPassword });
      cy.intercept("GET", `/v1/manage/artists/${artistId}*`).as("fetchArtist");
      cy.intercept("POST", `/v1/manage/artists/${artistId}/posts`).as(
        "createPost"
      );
      cy.intercept("PUT", `/v1/manage/artists/${artistId}/posts/*`).as(
        "updatePost"
      );
      cy.intercept("PUT", `/v1/manage/posts/*/publish`).as("publishPost");

      cy.visit(`/manage/artists/${artistId}/posts`);
      cy.wait("@fetchArtist");

      // Create a new draft post
      cy.contains("Add new post").click();
      cy.wait("@createPost");

      // Capture the new post's ID from the URL
      cy.url().should("match", /\/manage\/artists\/\d+\/post\/(\d+)\//);
      cy.url().then((url) => {
        const match = url.match(/\/post\/(\d+)\//);
        if (match) {
          subscriberPostId = Number(match[1]);
        }
      });

      cy.get("#input-title").type("Exclusive Subscriber Post");

      cy.get(".ProseMirror")
        .click()
        .type("This is exclusive content only for paying subscribers.");

      // The post is created with isPublic: false (subscribers-only is checked by default).
      // Select the subscription tier to enable the Publish button.
      cy.get("#select-minimum-tier").select("Supporter");

      // Publish the post — this saves title + content + tier then publishes.
      cy.contains("button", "Publish post").click();
      cy.wait("@publishPost").its("response.statusCode").should("equal", 200);
    });

    it("shows the gate to a non-subscriber", () => {
      cy.visit("/");
      cy.login({ email: nonSubscriberEmail, password: nonSubscriberPassword });
      cy.visit(`/${artistSlug}/posts/${subscriberPostId}/`);
      cy.contains("This post is for subscribers only.").should("exist");
      cy.contains(
        "This is exclusive content only for paying subscribers."
      ).should("not.exist");
    });

    it("shows the full post to the artist owner", () => {
      cy.login({ email: ownerEmail, password: ownerPassword });
      cy.visit(`/${artistSlug}/posts/${subscriberPostId}/`);
      cy.contains("This post is for subscribers only.").should("not.exist");
      cy.contains(
        "This is exclusive content only for paying subscribers."
      ).should("exist");
    });

    it("shows the full post to a subscriber", () => {
      cy.login({ email: subscriberEmail, password: subscriberPassword });
      cy.visit(`/${artistSlug}/posts/${subscriberPostId}/`);
      cy.contains("This post is for subscribers only.").should("not.exist");
      cy.contains(
        "This is exclusive content only for paying subscribers."
      ).should("exist");
    });
  });

  describe("subscriber-only post with minimum tier (created via task)", () => {
    let gatedPostId: number;

    before(() => {
      cy.task("createPost", {
        artistId,
        title: "Gated Content Post",
        urlSlug: "gated-content-post",
        content: SUBSCRIBER_CONTENT,
        isPublic: false,
        isDraft: false,
        publishedAt: new Date("2025-06-01").toISOString(),
        minimumSubscriptionTierId: tierId,
      }).then((post: any) => {
        gatedPostId = post.id;
      });
    });

    it("is hidden from a logged-out visitor", () => {
      cy.visit(`/${artistSlug}/posts/${gatedPostId}/`);
      cy.contains("This post is for subscribers only.").should("exist");
      cy.contains(
        "This is exclusive content only for paying subscribers."
      ).should("not.exist");
    });

    it("is hidden from a non-subscriber", () => {
      cy.login({ email: nonSubscriberEmail, password: nonSubscriberPassword });
      cy.visit(`/${artistSlug}/posts/${gatedPostId}/`);
      cy.contains("This post is for subscribers only.").should("exist");
      cy.contains(
        "This is exclusive content only for paying subscribers."
      ).should("not.exist");
    });

    it("is visible to a subscriber", () => {
      cy.login({ email: subscriberEmail, password: subscriberPassword });
      cy.visit(`/${artistSlug}/posts/${gatedPostId}/`);
      cy.contains("This post is for subscribers only.").should("not.exist");
      cy.contains(
        "This is exclusive content only for paying subscribers."
      ).should("exist");
    });
  });
});
