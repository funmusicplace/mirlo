/**
 * Resolves which user is the payee for an artist's money and payment
 * notifications: a release-level `paymentToUser` wins, then the artist's
 * `paymentToUser`, then the artist's own account.
 *
 * Resolution picks a whole user, not individual fields: if a payee is set
 * but missing a field (e.g. hasn't connected Stripe, no accounting email),
 * we don't fall back to another user's value for that field — money and
 * mail go to the payee or nowhere.
 *
 * The generics let callers pass whatever subset of `User` their query
 * selected; the returned union only exposes fields present on every
 * candidate that was provided.
 */
export const resolvePayee = <User, ProfilePayee = never, ReleasePayee = never>({
  profile,
  artist,
  releasePaymentToUser,
}: {
  profile?: { user: User; paymentToUser?: ProfilePayee | null };
  /**
   * Accepted while the artist->profile rename lands across the codebase.
   * Exactly one of `profile` or `artist` must be provided.
   */
  artist?: { user: User; paymentToUser?: ProfilePayee | null };
  releasePaymentToUser?: ReleasePayee | null;
}): User | ProfilePayee | ReleasePayee => {
  const payee = (profile ?? artist)!;
  return releasePaymentToUser ?? payee.paymentToUser ?? payee.user;
};
