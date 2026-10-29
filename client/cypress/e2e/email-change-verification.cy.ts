describe("email change verification", () => {
  before(() => {
    cy.on("uncaught:exception", (err) => {
      if (
        err.message.includes("Unauthorized") ||
        err.message.includes('"Unauthorized"')
      ) {
        return false;
      }
      return true;
    });
  });

  beforeEach(() => {
    cy.task("clearTables");
    cy.request("DELETE", "http://localhost:8025/api/v1/messages");
  });

  it("should verify email change through email verification link", () => {
    const originalEmail = "user@example.com";
    const newEmail = "newemail@example.com";
    const password = "test1234";

    // Create a user and a client
    cy.task("createUser", {
      email: originalEmail,
      password: password,
      emailConfirmationToken: null,
    }).then((createdUser: any) => {
      cy.task("createClient", { key: "test" }).then(() => {
        // Start by visiting the home page and authenticate via API login helper.
        cy.visit("/");
        cy.login({ email: originalEmail, password });

        // Navigate to account/profile settings
        cy.visit("/account");

        // Intercept the PUT request so we can wait for it to complete
        cy.intercept("PUT", /\/v1\/users\/\d+/).as("updateUser");

        // Find and fill the email input (get the last one since there might be multiple)
        cy.findByRole("textbox", { name: "Email:" }).clear().type(newEmail);

        // Find and fill password input
        cy.findByLabelText(
          "Updating your email requires entering your password"
        ).type(password);

        // Click save/submit button
        cy.findByRole("button", { name: "Update account" }).click();

        // Wait for the PUT request to complete and verify it succeeded
        cy.wait("@updateUser", { timeout: 10000 })
          .its("response.statusCode")
          .should("eq", 200);

        // The email is sent from the background queue, so poll MailHog for it
        const findConfirmationEmail = (
          attemptsLeft: number
        ): Cypress.Chainable<any> =>
          cy
            .request({
              method: "GET",
              url: "http://localhost:8025/api/v1/messages",
              headers: {
                Accept: "application/json",
              },
              retryOnNetworkFailure: true,
            })
            .then((response) => {
              expect(response.status).to.equal(200);
              expect(response.body).to.be.an("array");

              const message = response.body.find((msg: any) => {
                return (
                  msg.To?.some((to: any) => newEmail.includes(to.Mailbox)) &&
                  msg.Content.Headers.Subject?.some((subject: string) =>
                    subject.includes("Confirm")
                  )
                );
              });

              if (message || attemptsLeft <= 1) {
                return message;
              }
              return cy
                .wait(500)
                .then(() => findConfirmationEmail(attemptsLeft - 1));
            });

        findConfirmationEmail(30).then((emailMessage) => {
          expect(emailMessage).to.exist;

          // Get the full message to extract token
          cy.request({
            method: "GET",
            url: `http://localhost:8025/api/v1/messages/${emailMessage.ID}`,
          }).then((messageResponse) => {
            const fullMessage = messageResponse.body;

            // The email body is in HTML in the MIME part
            let emailBody: string = fullMessage.Content?.Body ?? "";
            if (fullMessage.MIME?.Parts) {
              const htmlPart = fullMessage.MIME.Parts.find((part: any) =>
                part.Headers["Content-Type"]?.[0]?.includes("text/html")
              );
              if (htmlPart) {
                emailBody = htmlPart.Body;
              }
            }

            const normalizedEmailBody = emailBody
              .replace(/=\r?\n/g, "")
              .replace(/=3D/g, "=")
              .replace(/&amp;/g, "&");

            // Extract token and userId from the confirmation URL
            const tokenMatch = normalizedEmailBody.match(
              /confirm-email-change\?token=([a-f0-9-]+)&userId=(\d+)/
            );

            expect(
              tokenMatch,
              `Confirmation URL not found in email body: ${normalizedEmailBody.slice(0, 300)}`
            ).to.exist;
            const token = tokenMatch![1];
            const userIdFromUrl = tokenMatch![2];

            // Simulate opening the email link in a fresh session and avoid stale JWT errors.
            cy.clearCookie("jwt");
            cy.clearCookie("refresh");

            // Navigate to the confirmation page
            cy.visit(
              `/confirm-email-change?token=${token}&userId=${userIdFromUrl}`
            );

            // Wait for confirmation message
            cy.findByRole("heading", {
              name: "Email verified! Redirecting...",
            }).should("exist");

            // Give it a moment to process and redirect
            cy.wait(2000);

            // Verify the email was actually changed in the database
            cy.task("getCurrentUser", newEmail).then((updatedUser: any) => {
              expect(updatedUser).to.exist;
              expect(updatedUser.email).to.equal(newEmail);
              expect(updatedUser.pendingEmail).to.be.null;
              expect(updatedUser.pendingEmailToken).to.be.undefined;
            });
          });
        });
      });
    });
  });

  it("should show error with expired/invalid token", () => {
    const originalEmail = "user2@example.com";
    const expiredToken = "00000000-0000-0000-0000-000000000000";

    cy.task("createUser", {
      email: originalEmail,
      emailConfirmationToken: null,
    }).then((createdUser: any) => {
      const userId = createdUser?.user?.id;
      expect(userId, "Expected createUser task to return user.id").to.exist;

      // Try to navigate with an invalid token
      cy.visit(`/confirm-email-change?token=${expiredToken}&userId=${userId}`, {
        failOnStatusCode: false,
      });

      // Should show error about invalid token
      cy.findByText(/no pending email change/i).should("exist");

      // Verify email was NOT changed
      cy.task("getCurrentUser", originalEmail).then((currentUser: any) => {
        expect(currentUser.email).to.equal(originalEmail);
        expect(currentUser.pendingEmail).to.be.null;
      });
    });
  });

  it("should not change email without password", () => {
    const originalEmail = "user3@example.com";
    const newEmail = "newemail3@example.com";
    const password = "test1234";

    cy.task("createUser", {
      email: originalEmail,
      password: password,
      emailConfirmationToken: null,
    }).then((createdUser: any) => {
      cy.task("createClient", { key: "test" }).then(() => {
        cy.visit("/");
        cy.login({ email: originalEmail, password });

        cy.visit("/account");

        // Try to change email without password
        cy.findByRole("textbox", { name: "Email:" }).clear().type(newEmail);

        // Don't fill password - try to submit
        cy.findByRole("button", { name: "Update account" }).click();

        // The browser blocks submission until the password is filled
        cy.findByLabelText(
          "Updating your email requires entering your password"
        ).should("match", ":invalid");

        // Verify email was NOT changed
        cy.task("getCurrentUser", originalEmail).then((currentUser: any) => {
          expect(currentUser.email).to.equal(originalEmail);
          expect(currentUser.pendingEmail).to.be.null;
        });
      });
    });
  });
});
