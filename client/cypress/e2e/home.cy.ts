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

  describe("newsletter signup", () => {
    const scrollToNewsletter = () => {
      cy.contains("Get on the mailing list").scrollIntoView();
    };

    it("sign up button is disabled until an email is entered", () => {
      scrollToNewsletter();
      cy.contains("button", "Sign up").should("be.disabled");
      cy.get("#input-newsletter-email").type(newsletterEmail);
      cy.contains("button", "Sign up").should("not.be.disabled");
    });

    it("completes the full signup flow", () => {
      scrollToNewsletter();
      cy.get("#input-newsletter-email").type(newsletterEmail);
      cy.contains("button", "Sign up").click();
      cy.wait("@verifyEmail");

      cy.get("[data-cy='modal']").should("be.visible");
      cy.contains("Check your inbox").should("be.visible");
      cy.contains(`We sent a verification code to ${newsletterEmail}`).should(
        "be.visible"
      );

      cy.get("#input-newsletter-code").type(verificationCode);
      cy.contains("button", "Verify & subscribe").click();
      cy.wait("@verifyEmail");
      cy.wait("@followArtist");

      cy.contains("Thanks! You're now on the list.").should("be.visible");
      cy.get("[data-cy='modal']").should("not.exist");
    });

    it("resends the verification code", () => {
      scrollToNewsletter();
      cy.get("#input-newsletter-email").type(newsletterEmail);
      cy.contains("button", "Sign up").click();
      cy.wait("@verifyEmail");

      cy.contains("button", "Resend code").click();
      cy.wait("@verifyEmail");
      cy.contains("Code resent!").should("be.visible");
    });

    it("shows an error when verification fails", () => {
      cy.intercept("POST", "/auth/verify-email", (req) => {
        if ("code" in req.body) {
          req.reply({
            statusCode: 400,
            body: { error: "Invalid verification code" },
          });
          return;
        }
        req.reply({ statusCode: 200, body: {} });
      }).as("verifyEmailFail");

      scrollToNewsletter();
      cy.get("#input-newsletter-email").type(newsletterEmail);
      cy.contains("button", "Sign up").click();
      cy.wait("@verifyEmailFail");

      cy.get("#input-newsletter-code").type("000000");
      cy.contains("button", "Verify & subscribe").click();
      cy.wait("@verifyEmailFail");

      cy.contains(
        "That code doesn't look right. Make sure you entered the correct number, or click resend code."
      ).should("be.visible");
      cy.get("[data-cy='modal']").should("be.visible");
    });

    it("resets code and step when modal is closed and reopened", () => {
      scrollToNewsletter();
      cy.get("#input-newsletter-email").type(newsletterEmail);
      cy.contains("button", "Sign up").click();
      cy.wait("@verifyEmail");

      cy.get("#input-newsletter-code").type("9999");
      cy.get("[aria-label='close']").click();
      cy.get("[data-cy='modal']").should("not.exist");

      cy.contains("button", "Sign up").click();
      cy.wait("@verifyEmail");
      cy.get("#input-newsletter-code").should("have.value", "");
    });
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
