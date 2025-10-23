import {
  ARTIST_EXAMPLE,
  POST_EXAMPLE,
  TRACK_GROUP_EXAMPLE,
} from "../../test/mocks";

const newsletterEmail = "listener@example.com";
const verificationCode = "123456";

const instanceArtist = {
  ...ARTIST_EXAMPLE,
  urlSlug: "example-artist",
};

const featuredRelease = {
  ...TRACK_GROUP_EXAMPLE,
  title: "Example Album",
  urlSlug: "example-album",
};

const popularRelease = {
  ...TRACK_GROUP_EXAMPLE,
  id: 2,
  title: "Popular Album",
  urlSlug: "popular-album",
  artist: {
    ...TRACK_GROUP_EXAMPLE.artist,
    id: 2,
    name: "Popular Artist",
    urlSlug: "popular-artist",
  },
};

const posts = [
  {
    ...POST_EXAMPLE,
  },
  {
    ...POST_EXAMPLE,
    id: 2,
    title: "Latest tour update",
    urlSlug: "latest-tour-update",
  },
];

describe("sales page", () => {
  beforeEach(() => {
    cy.setCookie("jwt", "valid-token", { httpOnly: true });
    cy.intercept("GET", "/auth/profile", {
      statusCode: 200,
      body: {
        result: {
          id: 1,
          email: "artist@example.com",
        },
      },
    }).as("authProfile");

    cy.intercept("GET", "/v1/settings/instanceArtist", {
      statusCode: 200,
      body: {
        result: instanceArtist,
      },
    }).as("instanceArtist");

    cy.intercept("GET", "/v1/manage/sales/*", (req) => {
      expect(req.query).to.include({
        take: "50",
      });

      req.reply({
        statusCode: 200,
        body: {
          results: [
            {
              amount: 999,
              artist: [
                {
                  id: 1,
                  name: "Example Artist",
                  urlSlug: "example-artist",
                },
              ],
              currency: "usd",
              datePurchased: "2024-01-01T00:00:00.000Z",
              trackGroupPurchases: [],
              track: {
                id: 1,
                urlSlug: "example-track",
                title: "Example Track",
                trackGroup: {
                  id: 1,
                  urlSlug: "example-album",
                  title: "Example Album",
                },
              },
            },
            {
              amount: 1000,
              artist: [
                {
                  id: 1,
                  name: "Example Artist",
                  urlSlug: "example-artist",
                },
              ],
              currency: "usd",
              datePurchased: "2024-01-02T00:00:00.000Z",
              trackGroupPurchases: [
                {
                  trackGroupId: 1,
                  message: "Example Album",
                  trackGroup: {
                    id: 1,
                    urlSlug: "example-album",
                    title: "Example Album",
                  },
                },
              ],
            },
          ],
          total: 2,
          totalAmount: 1999,
          totalSupporters: 2,
        },
      });
    }).as("fetchSales");

    cy.intercept("GET", "/v1/manage/artists*", (req) => {
      // expect(req.query).to.include({ take: "50" });

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

    cy.wait([
      "@fetchManagedArtists",
      "@fetchSales",
      "@authProfile",
      "@instanceArtist",
    ]);
  });

  it("renders sales from the API for a logged in user", () => {
    cy.contains("Sales");
    cy.contains("Total sales income: $19.99");
    cy.contains("Total supporters: 2");
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
            '[href="/example-artist/release/example-album/tracks/1"]'
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
