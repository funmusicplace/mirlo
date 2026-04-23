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

        // Find and fill the email input (get the last one since there might be multiple)
        cy.get('input[type="email"]')
          .first()
          .clear({ force: true })
          .type(newEmail, { force: true });

        // Find and fill password input
        cy.get('input[type="password"]').type(password, { force: true });

        // Click save/submit button
        cy.get("button")
          .contains(/update account/i)
          .first()
          .click({ force: true });

        // Wait for success message or email sent confirmation
        cy.contains(/email|confirm/i, {
          timeout: 5000,
        }).should("exist");

        // Query MailHog API for the email
        cy.wait(1000);
        cy.request({
          method: "GET",
          url: "http://localhost:8025/api/v1/messages",
          headers: {
            Accept: "application/json",
          },
          retryOnNetworkFailure: true,
        }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.be.an("array");
          cy.log(newEmail);

          // Find the email sent to the new email address
          const emailMessage = response.body?.find((msg: any) => {
            return (
              msg.To?.some((to: any) => newEmail.includes(to.Mailbox)) &&
              msg.Content.Headers.Subject?.some((subject: string) =>
                subject.includes("Confirm")
              )
            );
          });

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

            console.log("emailBody", normalizedEmailBody);

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
            cy.contains(/email|confirmed|success|updated/i, {
              timeout: 5000,
            }).should("exist");

            // Give it a moment to process and redirect
            cy.wait(2000);

            // Verify the email was actually changed in the database
            cy.task("getCurrentUser", newEmail).then((updatedUser: any) => {
              expect(updatedUser).to.exist;
              expect(updatedUser.email).to.equal(newEmail);
              expect(updatedUser.pendingEmail).to.be.null;
              expect(updatedUser.pendingEmailToken).to.be.null;
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
      cy.contains(/no pending email change/i, { timeout: 5000 }).should(
        "exist"
      );

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
        cy.get('input[type="email"]')
          .last()
          .clear({ force: true })
          .type(newEmail, { force: true });

        // Don't fill password - try to submit
        cy.get("button")
          .contains(/save|update|change|submit/i)
          .first()
          .click({ force: true });

        // Should show error
        cy.contains(/password|required|error/i, { timeout: 5000 }).should(
          "exist"
        );

        // Verify email was NOT changed
        cy.task("getCurrentUser", originalEmail).then((currentUser: any) => {
          expect(currentUser.email).to.equal(originalEmail);
          expect(currentUser.pendingEmail).to.be.null;
        });
      });
    });
  });
});
