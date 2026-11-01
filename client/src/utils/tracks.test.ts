import { describe, test, expect } from "vitest";

import { isTrackOwnedOrPreview } from "./tracks";

const makeTrack = (overrides: Partial<Track> = {}): Track =>
  ({
    id: 1,
    isPreview: false,
    trackGroup: {
      artist: { id: 100, userId: 7 },
      userTrackGroupPurchases: [],
    },
    ...overrides,
  }) as unknown as Track;

const makeUser = (id: number): LoggedInUser =>
  ({ id, artists: [] }) as unknown as LoggedInUser;

describe("isTrackOwnedOrPreview", () => {
  test("returns true for a preview track even with no user", () => {
    const track = makeTrack({ isPreview: true });
    expect(isTrackOwnedOrPreview(track)).toBe(true);
  });

  test("returns false for a non-preview track with no user", () => {
    const track = makeTrack();
    expect(isTrackOwnedOrPreview(track)).toBe(false);
  });

  test("returns true when user owns the artist (artist.userId matches user.id)", () => {
    const track = makeTrack({
      trackGroup: {
        artist: { id: 100, userId: 7 },
        userTrackGroupPurchases: [],
      } as unknown as TrackGroup,
    });
    expect(isTrackOwnedOrPreview(track, makeUser(7))).toBe(true);
  });

  test("does not falsely claim ownership when artist.id coincidentally equals user.id", () => {
    const track = makeTrack({
      trackGroup: {
        artist: { id: 7, userId: 42 },
        userTrackGroupPurchases: [],
      } as unknown as TrackGroup,
    });
    expect(isTrackOwnedOrPreview(track, makeUser(7))).toBe(false);
  });

  test("returns true when user has purchased the trackGroup", () => {
    const track = makeTrack({
      trackGroup: {
        artist: { id: 100, userId: 999 },
        userTrackGroupPurchases: [{ userId: 7 }],
      } as unknown as TrackGroup,
    });
    expect(isTrackOwnedOrPreview(track, makeUser(7))).toBe(true);
  });

  test("returns true when user has purchased the track alone", () => {
    const track = makeTrack({
      trackGroup: {
        artist: { id: 100, userId: 999 },
        userTrackGroupPurchases: [],
      } as unknown as TrackGroup,
    });
    const user = {
      ...makeUser(7),
      userTrackPurchases: [{ trackId: track.id }],
    } as LoggedInUser;
    expect(isTrackOwnedOrPreview(track, user)).toBe(true);
  });

  test("returns false for a buyer of a pre-order, without a trackGroup arg", () => {
    const track = makeTrack({
      trackGroup: {
        isPreorder: true,
        releaseDate: new Date(Date.now() + 86400000).toISOString(),
        artist: { id: 100, userId: 999 },
        userTrackGroupPurchases: [{ userId: 7 }],
      } as unknown as TrackGroup,
    });
    const user = {
      ...makeUser(7),
      userTrackPurchases: [{ trackId: track.id }],
    } as LoggedInUser;
    expect(isTrackOwnedOrPreview(track, user)).toBe(false);
  });

  test("returns false for a buyer while a pre-order runs past its release date", () => {
    const track = makeTrack({
      trackGroup: {
        isPreorder: true,
        releaseDate: new Date(Date.now() - 86400000).toISOString(),
        artist: { id: 100, userId: 999 },
        userTrackGroupPurchases: [{ userId: 7 }],
      } as unknown as TrackGroup,
    });
    expect(isTrackOwnedOrPreview(track, makeUser(7))).toBe(false);
  });

  test("returns false for a buyer of a pre-order when trackGroup arg is passed", () => {
    const trackGroup = {
      isPreorder: true,
      artist: { id: 100, userId: 999 },
      userTrackGroupPurchases: [{ userId: 7 }],
    } as unknown as TrackGroup;
    const track = makeTrack();
    expect(isTrackOwnedOrPreview(track, makeUser(7), trackGroup)).toBe(false);
  });

  test("returns true for a buyer with a future releaseDate when it is not a pre-order", () => {
    const trackGroup = {
      releaseDate: new Date(Date.now() + 86400000).toISOString(),
      artist: { id: 100, userId: 999 },
      userTrackGroupPurchases: [{ userId: 7 }],
    } as unknown as TrackGroup;
    const track = makeTrack();
    expect(isTrackOwnedOrPreview(track, makeUser(7), trackGroup)).toBe(true);
  });

  test("returns true for the artist on their own pre-order when trackGroup arg is passed", () => {
    const trackGroup = {
      isPreorder: true,
      releaseDate: new Date(Date.now() + 86400000).toISOString(),
      artist: { id: 100, userId: 7 },
      userTrackGroupPurchases: [],
    } as unknown as TrackGroup;
    const track = makeTrack();
    expect(isTrackOwnedOrPreview(track, makeUser(7), trackGroup)).toBe(true);
  });

  test("uses the explicit trackGroup arg over track.trackGroup when provided", () => {
    const track = makeTrack({
      trackGroup: {
        artist: { id: 100, userId: 7 },
        userTrackGroupPurchases: [],
      } as unknown as TrackGroup,
    });
    const otherTrackGroup = {
      artist: { id: 200, userId: 999 },
      userTrackGroupPurchases: [],
    } as unknown as TrackGroup;
    expect(isTrackOwnedOrPreview(track, makeUser(7), otherTrackGroup)).toBe(
      false
    );
  });
});
