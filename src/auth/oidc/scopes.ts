export const OAUTH_SCOPES = [
  "openid",
  "offline_access",
  "profile",
  "email",
  "account",
  "subscribers:read",
];

export const requestedScopes = (scope: unknown) =>
  String(scope ?? "")
    .split(" ")
    .filter((s) => OAUTH_SCOPES.includes(s));
