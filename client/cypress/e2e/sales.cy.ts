/// <reference types="cypress" />

const adminUserEmail = "admin@admin.example";
const adminPassword = "test1234";

const newsletterEmail = "listener@example.com";
const verificationCode = "123456";

const instanceArtist = {
  // ...ARTIST_EXAMPLE,
  name: "Example Artist",
  urlSlug: "example-artist",
};

const featuredRelease = {
  // ...TRACK_GROUP_EXAMPLE,
  title: "Example Album",
  urlSlug: "example-album",
};

const popularRelease = {
  // ...TRACK_GROUP_EXAMPLE,
  id: 2,
  title: "Popular Album",
  urlSlug: "popular-album",
  artist: {
    // ...TRACK_GROUP_EXAMPLE.artist,
    id: 2,
    name: "Popular Artist",
    urlSlug: "popular-artist",
  },
};

const posts = [
  {
    // ...POST_EXAMPLE,
  },
  {
    // ...POST_EXAMPLE,
    id: 2,
    title: "Latest tour update",
    urlSlug: "latest-tour-update",
  },
];

describe("sales page", () => {
  let listenerId: number;
  let trackId: number;
  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: newsletterEmail,
      password: "listenerpassword",
      emailConfirmationToken: null,
      name: "Listener",
    })
      .then((listener) => {
        cy.log("listener", listener.user);
        listenerId = listener.user.id;
        return cy.task("createUser", {
          email: adminUserEmail,
          password: adminPassword,
          emailConfirmationToken: null,
          name: "Jim",
        });
      })
      .then((user) => {
        cy.log("user", user.user);
        return cy
          .login({ email: adminUserEmail, password: adminPassword })
          .then((response) => {
            cy.log(`usrId: ${user.user.id}`);
            return cy.task("createArtist", {
              userId: user.user.id,
              name: instanceArtist.name,
              urlSlug: instanceArtist.urlSlug,
            });
          });
      })

      .then((artist) => {
        cy.task("createTrackGroup", {
          title: featuredRelease.title,
          urlSlug: featuredRelease.urlSlug,
          artistId: artist.id,
        });
      })
      .then((trackGroup) => {
        cy.task("createUserTrackGroupPurchase", {
          trackGroupId: trackGroup.id,
          purchaserUserId: listenerId,
        });
        cy.task("createTrack", {
          title: "Example Track",
          urlSlug: "example-track",
          trackGroupId: trackGroup.id,
          allowIndividualSale: true,
        });
      })
      .then((track) => {
        trackId = track.id;
        cy.task("createUserTrackPurchase", {
          trackId: track.id,
          purchaserUserId: listenerId,
          data: { amount: 999 },
        });
      });
  });

  beforeEach(() => {
    cy.intercept("GET", "/auth/profile").as("authProfile");
    cy.intercept("GET", "/v1/settings/instanceArtist").as("instanceArtist");

    cy.intercept("GET", "/v1/manage/sales/*", (req) => {
      expect(req.query).to.include({
        take: "50",
      });
    }).as("fetchSales");

    cy.intercept("GET", "/v1/manage/artists*", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          results: [
            {
              id: 1,
              name: "Example Artist",
              urlSlug: "example-artist",
            },
          ],
          total: 1,
        },
      });
    }).as("fetchManagedArtists");

    cy.visit("/sales");

    cy.wait(["@authProfile"]);
  });

  it("renders sales from the API for a logged in user", () => {
    cy.contains("Sales");
    cy.contains("Total sales income: $19.99");
    cy.contains("Total supporters: 1");
    cy.contains("Total sales: 2");

    cy.get("table tbody").within(() => {
      cy.get("tr")
        .first()
        .within(() => {
          cy.contains("Example Artist");
          cy.contains("Example Track");
          cy.contains("$9.99");
          cy.contains("Track");
          cy.get(
            `[href="/example-artist/release/example-album/tracks/${trackId}"]`
          ).should("exist");
        });
      cy.get("tr")
        .last()
        .within(() => {
          cy.contains("Example Artist");
          cy.contains("Example Album");
          cy.contains("$10.00");
          cy.contains("Release");
          cy.get('[href="/example-artist/release/example-album"]').should(
            "exist"
          );
        });
    });
  });
});
