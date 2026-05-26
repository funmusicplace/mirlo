export const matchesTokens = (
  haystacks: (string | undefined | null)[],
  query: string
) => {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const fields = haystacks.map((h) => (h ?? "").toLowerCase());
  return tokens.every((tok) => fields.some((f) => f.includes(tok)));
};
