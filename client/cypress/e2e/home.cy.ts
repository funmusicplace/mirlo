import {
  ARTIST_EXAMPLE,
  POST_EXAMPLE,
  TRACK_GROUP_EXAMPLE,
} from "../../../client/test/mocks";

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

describe("home page", () => {
  beforeEach(() => {
    cy.intercept("GET", "/auth/profile", {
      statusCode: 200,
      body: { result: null },
    }).as("authProfile");

    cy.intercept("GET", "/v1/trackGroups*", (req) => {
      expect(req.query).to.include({
        take: "8",
        distinctArtists: "false",
        isReleased: "released",
      });
      expect(req.query.orderBy).to.equal("random");

      req.reply({
        statusCode: 200,
        body: {
          results: [featuredRelease],
          total: 1,
        },
      });
    }).as("trackGroups");

    cy.intercept("GET", "/v1/trackGroups/topSold*", (req) => {
      expect(req.query).to.include({
        take: "6",
        datePurchased: "pastMonth",
      });

      req.reply({
        statusCode: 200,
        body: {
          results: [popularRelease],
          total: 1,
        },
      });
    }).as("topSoldTrackGroups");

    cy.intercept("GET", "/v1/tags*", (req) => {
      expect(req.query).to.include({
        take: "20",
        orderBy: "count",
      });

      req.reply({
        statusCode: 200,
        body: {
          results: [{ tag: "experimental" }, { tag: "ambient" }],
          total: 2,
        },
      });
    }).as("tags");

    cy.intercept("GET", "/v1/posts*", (req) => {
      expect(req.query).to.include({
        take: "6",
      });

      req.reply({
        statusCode: 200,
        body: {
          results: posts,
          total: posts.length,
        },
      });
    }).as("posts");

    cy.intercept("GET", "/v1/settings/instanceArtist", {
      statusCode: 200,
      body: {
        result: instanceArtist,
      },
    }).as("instanceArtist");

    cy.intercept("POST", "/auth/verify-email", (req) => {
      if ("code" in req.body) {
        expect(req.body).to.deep.equal({
          code: verificationCode,
          email: newsletterEmail,
        });

        req.reply({
          statusCode: 200,
          body: { userId: "42" },
        });
        return;
      }

      expect(req.body).to.deep.equal({ email: newsletterEmail });
      req.reply({ statusCode: 200, body: {} });
    }).as("verifyEmail");

    cy.intercept("POST", "/v1/artists/1/follow", (req) => {
      expect(req.body).to.deep.equal({ email: newsletterEmail });

      req.reply({ statusCode: 200, body: {} });
    }).as("followArtist");

    cy.visit("/");

    cy.wait([
      "@authProfile",
      "@trackGroups",
      "@topSoldTrackGroups",
      "@tags",
      "@posts",
      "@instanceArtist",
    ]);
  });

  it("renders curated sections with links to releases, posts, and tags", () => {
    cy.contains("Recent releases").scrollIntoView().should("be.visible");
    cy.contains("a", featuredRelease.title)
      .scrollIntoView()
      .should("be.visible")
      .and("have.attr", "href", "/example-artist/release/example-album");
    cy.contains("a", featuredRelease.artist.name)
      .scrollIntoView()
      .should("be.visible")
      .and("have.attr", "href", "/example-artist");

    cy.contains("Recent purchases").scrollIntoView().should("be.visible");
    cy.contains("a", popularRelease.title)
      .scrollIntoView()
      .should("be.visible")
      .and("have.attr", "href", "/popular-artist/release/popular-album");

    cy.contains("Popular Tags").scrollIntoView().should("be.visible");
    cy.contains("a", "experimental")
      .scrollIntoView()
      .should("be.visible")
      .and("have.attr", "href", "/releases?tag=experimental");
    cy.contains("a", "Browse tags")
      .scrollIntoView()
      .should("be.visible")
      .and("have.attr", "href", "/tags");

    cy.contains("Latest posts from the community")
      .scrollIntoView()
      .should("be.visible");
    cy.contains(posts[0].title).scrollIntoView().should("be.visible");

    cy.contains("Support Mirlo").should("be.visible");
    cy.contains(
      "Mirlo's work is sustained by our community, not by venture capital."
    ).should("be.visible");
    cy.get('a[href="/example-artist/support"]').should(
      "contain",
      "Support Mirlo"
    );

    cy.contains("Get on the mailing list").should("be.visible");
    cy.contains("button", "Sign up").should("be.visible");
  });
});
