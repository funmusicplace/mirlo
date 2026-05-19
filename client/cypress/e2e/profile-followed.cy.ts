const followerEmail = "follower@example.com";
const password = "test1234";
const followArtistName = "Follow Me Band";
const subscribeArtistName = "Subscribe Me Band";
const paidTierName = "Gold tier";

describe("/profile/followed", () => {
  beforeEach(() => {
    cy.task("clearTables");
    cy.task("createClient", { key: "test" });

    cy.task("createUser", {
      email: followerEmail,
      password,
      emailConfirmationToken: null,
    }).then((result: any) => {
      const followerId = result.user.id;

      cy.task("createUser", { email: "artistA@example.com", password }).then(
        (a: any) => {
          cy.task("createArtist", {
            userId: a.user.id,
            name: followArtistName,
          }).then((artist: any) => {
            cy.task("createTier", {
              artistId: artist.id,
              name: "Default",
              isDefaultTier: true,
            }).then((tier: any) => {
              cy.task("createSubscription", {
                userId: followerId,
                tierId: tier.id,
                amount: 0,
              });
            });
          });
        }
      );

      cy.task("createUser", { email: "artistB@example.com", password }).then(
        (b: any) => {
          cy.task("createArtist", {
            userId: b.user.id,
            name: subscribeArtistName,
          }).then((artist: any) => {
            cy.task("createTier", {
              artistId: artist.id,
              name: paidTierName,
              minAmount: 500,
              isDefaultTier: false,
            }).then((tier: any) => {
              cy.task("createSubscription", {
                userId: followerId,
                tierId: tier.id,
                amount: 500,
              });
            });
          });
        }
      );
    });
  });

  it("redirects /profile to /profile/followed when logged in", () => {
    cy.login({ email: followerEmail, password });
    cy.visit("/profile");
    cy.location("pathname").should("eq", "/profile/followed");
  });

  it("shows both followed and subscribed artists by default", () => {
    cy.login({ email: followerEmail, password });
    cy.visit("/profile/followed");

    cy.contains("h1", "Followed artists").should("be.visible");
    cy.contains(followArtistName).should("be.visible");
    cy.contains(subscribeArtistName).should("be.visible");
    cy.contains(paidTierName).should("be.visible");
  });

  it("filters to subscriptions only when Subscriptions is selected", () => {
    cy.login({ email: followerEmail, password });
    cy.visit("/profile/followed");

    cy.contains("label", "Subscriptions").click();

    cy.contains(subscribeArtistName).should("be.visible");
    cy.contains(paidTierName).should("be.visible");
    cy.contains(followArtistName).should("not.exist");
  });

  it("filters to follows only when Following is selected", () => {
    cy.login({ email: followerEmail, password });
    cy.visit("/profile/followed");

    cy.contains("label", "Following").click();

    cy.contains(followArtistName).should("be.visible");
    cy.contains(subscribeArtistName).should("not.exist");
    cy.contains(paidTierName).should("not.exist");
  });
});
