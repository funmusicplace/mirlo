export const OAUTH_SCOPES = [
  "openid",
  "offline_access",
  "profile",
  "email",
  "api",
  "subscribers:read",
  "pos",
];

export const requestedScopes = (scope: unknown) =>
  String(scope ?? "")
    .split(" ")
    .filter((s) => OAUTH_SCOPES.includes(s));
