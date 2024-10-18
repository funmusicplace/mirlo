import sinon from 'sinon';
import { expect } from 'chai';
import { getArtistUrl, getReleaseUrl } from '../../artist';

describe('Artist Tests', () => {
  it('getArtistUrl should return artist URL by id or slug', () => {
    expect(getArtistUrl({ id: 1 })).to.equal('/1');
    expect(getArtistUrl({ urlSlug: 'artist-slug' })).to.equal('/artist-slug');
  });

  it('getReleaseUrl should return release URL by artist and trackGroup', () => {
    const artist = { id: 1, urlSlug: 'artist-slug' };
    const trackGroup = { id: 2, urlSlug: 'track-slug' };
    expect(getReleaseUrl(artist, trackGroup)).to.equal('/artist-slug/release/track-slug');
  });

  // ... other tests converted similarly ...
});