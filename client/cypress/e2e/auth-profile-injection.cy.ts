/**
 * Tests that auth profile data is injected into the page HTML on direct load,
 * so the client doesn't need to wait for /auth/profile to show logged-in state.
 */

const email = "injectiontest@example.com";
const password = "test1234";

describe("auth profile injection", () => {
  beforeEach(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email,
      password,
      emailConfirmationToken: null,
    });

    cy.task("createClient", { key: "test" });
  });

  it("injects __MIRLO_AUTH__ script with user data when logged in", () => {
    cy.login({ email, password });

    cy.visit("/");

    cy.document().then((doc) => {
      const script = doc.getElementById("__MIRLO_AUTH__");
      expect(script).to.exist;
      expect(script!.getAttribute("type")).to.eq("application/json");

      const data = JSON.parse(script!.textContent!);
      expect(data).to.have.property("user");
      expect(data.user).to.have.property("email", email);
      expect(data).to.have.property("injectedAt");
    });
  });

  it("does not inject __MIRLO_AUTH__ when not logged in", () => {
    cy.visit("/");

    cy.document().then((doc) => {
      const script = doc.getElementById("__MIRLO_AUTH__");
      expect(script).to.be.null;
    });
  });

  it("shows logged-in UI from injected auth data", () => {
    cy.login({ email, password });

    cy.intercept("GET", "/auth/profile").as("authProfile");

    cy.visit("/");

    // Verify auth payload was server-injected
    cy.document().then((doc) => {
      const script = doc.getElementById("__MIRLO_AUTH__");
      expect(script, "expected injected auth script").to.exist;

      const data = JSON.parse(script!.textContent!);
      expect(data.user?.email, "expected injected auth user email").to.eq(
        email
      );
    });

    // Should show user-specific UI immediately from injected data
    cy.get("[data-cy='user-nav']").should("be.visible");

    // Verify that /auth/profile is still called (after UI is already visible)
    cy.wait("@authProfile").its("response.statusCode").should("eq", 200);
  });
});
