/// <reference types="cypress" />

const postDraftEmail = "post-draft-admin@example.com";
const postDraftPassword = "test1234";

const bodyDraftKey = (id: number) => `postBodyDraft-${id}`;

/** Wait until the debounced body draft is persisted (500ms debounce in useBodyDraft). */
const waitForBodyDraft = (id: number, expectedText: string) => {
  cy.window().should((win) => {
    const draft = win.localStorage.getItem(bodyDraftKey(id));
    expect(draft, "body draft should be in localStorage").to.be.a("string");
    expect(draft!).to.include(expectedText);
    expect(draft!).not.to.equal("<p>Original server body</p>");
  });
};

describe("manage post draft restore", () => {
  let artistId: number;
  let postId: number;

  before(() => {
    cy.task("clearTables");

    cy.task("createUser", {
      email: postDraftEmail,
      password: postDraftPassword,
      emailConfirmationToken: null,
      name: "Post Draft Admin",
      currency: "usd",
    })
      .then((user) => {
        const typedUser = user as { user: { id: number } };
        return cy
          .login({ email: postDraftEmail, password: postDraftPassword })
          .then(() => typedUser);
      })
      .then((user) => {
        return cy.task("createArtist", {
          userId: user.user.id,
          name: "Post Draft Artist",
          urlSlug: "post-draft-artist",
        });
      })
      .then((artist) => {
        const typedArtist = artist as { id: number };
        artistId = typedArtist.id;
        return cy.task("createPost", {
          artistId,
          title: "Original Post Title",
          urlSlug: "original-post",
          content: "<p>Original server body</p>",
          isDraft: true,
        });
      })
      .then((post) => {
        const typedPost = post as { id: number };
        postId = typedPost.id;
      });
  });

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login({ email: postDraftEmail, password: postDraftPassword });
    cy.intercept("GET", "/auth/profile").as("authProfile");

    cy.visit(`/manage/artists/${artistId}/post/${postId}`);
    cy.wait("@authProfile");
    cy.get(".ProseMirror").should("contain.text", "Original server body");
  });

  it("restores the body content from local storage on reload", () => {
    cy.get(".ProseMirror").click().type(" plus mes edits");
    waitForBodyDraft(postId, "plus mes edits");

    cy.reload();
    cy.wait("@authProfile");

    cy.contains("Some unsaved changes have been restored").should("be.visible");
    cy.get(".ProseMirror").should("contain.text", "plus mes edits");
  });

  it("Discard reverts the body to the server value and clears the banner", () => {
    cy.get(".ProseMirror").click().type(" to be discarded");
    waitForBodyDraft(postId, "to be discarded");

    cy.reload();
    cy.wait("@authProfile");

    cy.contains("Some unsaved changes have been restored").should("be.visible");
    cy.get(".ProseMirror").should("contain.text", "to be discarded");

    cy.contains("button", "Discard").click();

    cy.contains("Some unsaved changes have been restored").should("not.exist");
    cy.get(".ProseMirror").should("contain.text", "Original server body");
    cy.get(".ProseMirror").should("not.contain.text", "to be discarded");
  });

  it("Keep dismisses the banner and leaves the restored body untouched", () => {
    cy.get(".ProseMirror").click().type(" kept content");
    waitForBodyDraft(postId, "kept content");

    cy.reload();
    cy.wait("@authProfile");

    cy.contains("Some unsaved changes have been restored").should("be.visible");
    cy.get(".ProseMirror").should("contain.text", "kept content");

    cy.contains("button", "Keep").click();

    cy.contains("Some unsaved changes have been restored").should("not.exist");
    cy.get(".ProseMirror").should("contain.text", "kept content");
  });
});
