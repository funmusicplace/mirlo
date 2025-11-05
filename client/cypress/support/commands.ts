/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//

const THISURL = Cypress.env("API_DOMAIN") || "http://localhost:3000";

Cypress.Commands.add("login", (data) => {
  cy.log(JSON.stringify(Cypress.env()));
  cy.log(`Logging in as ${data.email}`);
  cy.request({
    method: "POST",
    url: `${THISURL}/auth/login`,
    body: {
      email: data.email,
      password: data.password,
    },
  }).then((response) => {
    expect(response.status).to.eq(200);
    cy.log(`Logged in as ${data.email} successfully`);
    const jwtCookie = response.headers["set-cookie"][0]
      .split(";")[0]
      .split("=")[1];
    cy.setCookie("jwt", jwtCookie, {
      httpOnly: true,
    });
  });
});
