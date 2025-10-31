import "./commands";

declare global {
  namespace Cypress {
    interface Chainable {
      login({
        email,
        password,
      }: {
        email: string;
        password: string;
      }): Chainable<void>;
      createTrackGroup(data: {
        title: string;
        urlSlug: string;
        artistId: number;
      }): Chainable<{ id: number }>;
      createArtist(data: {
        name: string;
        urlSlug: string;
      }): Chainable<Response<{ result: { id: number } }>>;
      createTrackGroupPurchase(data: {
        trackGroupId: number;
        purchaserUserId: number;
      }): Chainable<void>;
    }
  }
}
