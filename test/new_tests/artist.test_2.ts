// tests/artist.test.ts
import { getArtistUrl, getReleaseUrl } from '../artist';

describe('Artist Tests', () => {
  test('getArtistUrl should return artist URL by id or slug', () => {
    expect(getArtistUrl({ id: 1 })).toBe('/1');
    expect(getArtistUrl({ urlSlug: 'artist-slug' })).toBe('/artist-slug');
  });

  test('getReleaseUrl should return release URL by artist and trackGroup', () => {
    const artist = { id: 1, urlSlug: 'artist-slug' };
    const trackGroup = { id: 2, urlSlug: 'track-slug' };
    expect(getReleaseUrl(artist, trackGroup)).toBe('/artist-slug/release/track-slug');
  });
});
