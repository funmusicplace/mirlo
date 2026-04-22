/// <reference types="cypress" />

const userEmail = "subscription-admin@example.com";
const userPassword = "test1234";

describe("manage subscription tier", () => {
  let artistId: number;
  let trackGroupIds: number[] = [];

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: userEmail,
      password: userPassword,
      emailConfirmationToken: null,
      name: "Subscription Admin",
      currency: "usd",
    })
      .then((user) => {
        const typedUser = user as { user: { id: number } };
        return cy
          .login({ email: userEmail, password: userPassword })
          .then(() => typedUser);
      })
      .then((user) => {
        return cy.task("createArtist", {
          userId: user.user.id,
          name: "Subscriber Artist",
          urlSlug: "subscriber-artist",
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };
        artistId = typedArtist.id;

        // Create multiple releases to select from
        return cy.task("createTrackGroup", {
          artistId,
          title: "Exclusive Album",
          urlSlug: "exclusive-album",
          minPrice: 0,
        });
      })
      .then((trackGroup1) => {
        const typedTrackGroup = trackGroup1 as { id: number };
        trackGroupIds.push(typedTrackGroup.id);

        return cy.task("createTrackGroup", {
          artistId,
          title: "Premium Collection",
          urlSlug: "premium-collection",
          minPrice: 0,
        });
      })
      .then((trackGroup2) => {
        const typedTrackGroup = trackGroup2 as { id: number };
        trackGroupIds.push(typedTrackGroup.id);
      });
  });

  beforeEach(() => {
    cy.intercept("GET", "/auth/profile").as("authProfile");
    cy.intercept("GET", `/v1/manage/artists/${artistId}/subscriptionTiers*`).as(
      "getSubscriptionTiers"
    );
    cy.intercept(
      "GET",
      `/v1/manage/artists/${artistId}/subscriptionTiers/*`
    ).as("getSubscriptionTier");
    cy.intercept(
      "PUT",
      `/v1/manage/artists/${artistId}/subscriptionTiers/*`
    ).as("updateSubscriptionTier");
    cy.intercept("GET", `/v1/artists/${artistId}*`).as("getArtist");

    cy.visit(`/manage/artists/${artistId}/tiers`);
    cy.wait("@authProfile");
  });

  it("creates a subscription tier with all fields filled and linked releases, then verifies on reload and public profile", () => {
    // Navigate to create subscription tier
    cy.contains("button", "Add new tier").click();

    // Wait for navigation to the edit page for the new tier
    cy.url().should("include", "/tiers/");

    // Wait for the tier data to load
    cy.wait("@getSubscriptionTier");
    cy.get('input[name="name"]').should("be.visible");

    // Fill in subscription tier form fields (select all existing text first, then type)
    cy.get('input[name="name"]')
      .focus()
      .type("{selectAll}Platinum Member")
      .blur();
    cy.get('textarea[name="description"]')
      .focus()
      .type(
        "{selectAll}Exclusive access to all premium content and early releases"
      )
      .blur();

    // Set subscription price
    cy.get('input[name="minAmount"]').focus().type("{selectAll}9.99").blur();

    // Set interval to MONTH (should be the default)
    cy.get('select[name="interval"]').should("have.value", "MONTH");

    // Enable variable amounts
    cy.get('input[name="allowVariable"]').check({ force: true });

    // Enable auto-purchase
    cy.get('input[name="autoPurchaseAlbums"]').check({ force: true });

    // Enable address collection
    cy.get('input[name="collectAddress"]')
      .check({ force: true })
      .should("be.checked");

    // Set platform fee percentage - use keyboard to select all and type in one action
    cy.get('input[type="number"][name="platformPercent"]')
      .focus()
      .type("{selectAll}15")
      .blur();

    // Set digital discount
    cy.get('input[type="number"][name="digitalDiscountPercent"]')
      .focus()
      .type("{selectAll}10")
      .blur();

    // Set merch discount
    cy.get('input[type="number"][name="merchDiscountPercent"]')
      .focus()
      .type("{selectAll}20")
      .blur();

    // Verify all values are set correctly before submitting
    cy.get('input[name="name"]').should("have.value", "Platinum Member");
    cy.get('textarea[name="description"]').should(
      "have.value",
      "Exclusive access to all premium content and early releases"
    );
    cy.get('input[name="minAmount"]').should("have.value", "9.99");
    cy.get('input[name="allowVariable"]').should("be.checked");
    cy.get('input[name="autoPurchaseAlbums"]').should("be.checked");
    cy.get('input[name="collectAddress"]').should("be.checked");
    cy.get('input[type="number"][name="platformPercent"]').should(
      "have.value",
      "15"
    );
    cy.get('input[type="number"][name="digitalDiscountPercent"]').should(
      "have.value",
      "10"
    );
    cy.get('input[type="number"][name="merchDiscountPercent"]').should(
      "have.value",
      "20"
    );

    // Select related releases by clicking on them in the release selector
    cy.contains("label", "Releases included with subscription").should("exist");

    // Find and click the first release checkbox
    cy.contains("label", "Exclusive Album")
      .find("input[type='checkbox']")
      .check({
        force: true,
      });

    // Find and click the second release checkbox
    cy.contains("label", "Premium Collection")
      .find("input[type='checkbox']")
      .check({ force: true });

    // Scroll the form to top to ensure button is in view
    cy.get("form").scrollIntoView({ position: "bottom" });

    // Save the subscription tier
    cy.contains("button", "Save subscription").click();

    // Wait for the form submission (PUT request to update the tier)
    cy.wait("@updateSubscriptionTier").then((xhr) => {
      // Just verify the request was successful (2xx status)
      expect(xhr.response?.statusCode).to.be.within(200, 299);
    });

    // Wait for the subscription tier to load after form submission
    cy.wait("@getSubscriptionTier");

    // Verify we're back on the list page and the tier is visible
    cy.contains("Platinum Member").should("exist");

    // Reload the page to verify all changes persist
    cy.reload();
    cy.wait("@authProfile");
    cy.wait("@getSubscriptionTiers");

    // Verify all fields are still there after reload
    cy.contains("Platinum Member").should("exist");

    // Verify form fields are populated with saved values
    cy.get('input[name="name"]').should("have.value", "Platinum Member");
    cy.get('textarea[name="description"]').should(
      "have.value",
      "Exclusive access to all premium content and early releases"
    );
    cy.get('input[name="minAmount"]').should("have.value", "9.99");
    cy.get('input[name="allowVariable"]').should("be.checked");
    cy.get('input[name="autoPurchaseAlbums"]').should("be.checked");
    cy.get('input[name="collectAddress"]').should("be.checked");
    cy.get('input[type="number"][name="platformPercent"]').should(
      "have.value",
      "15"
    );
    cy.get('input[type="number"][name="digitalDiscountPercent"]').should(
      "have.value",
      "10"
    );
    cy.get('input[type="number"][name="merchDiscountPercent"]').should(
      "have.value",
      "20"
    );

    // Verify related releases are still selected
    cy.contains("label", "Exclusive Album")
      .find("input[type='checkbox']")
      .should("be.checked");
    cy.contains("label", "Premium Collection")
      .find("input[type='checkbox']")
      .should("be.checked");

    // Navigate to artist's public profile support page
    cy.visit(`/subscriber-artist/support`);
    cy.wait("@authProfile");
    cy.wait("@getArtist");

    // Wait for the subscription tier to actually render on the page
    cy.contains("Platinum Member").should("be.visible");
    cy.contains(/\$9\.99.*Month/).should("be.visible");

    // Verify included releases are shown
    cy.contains("Exclusive Album").should("exist");
    cy.contains("Premium Collection").should("exist");
  });
});
