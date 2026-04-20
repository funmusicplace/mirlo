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

  test("returns false for a future releaseDate when trackGroup arg is passed", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const trackGroup = {
      releaseDate: futureDate,
      artist: { id: 100, userId: 999 },
      userTrackGroupPurchases: [{ userId: 7 }],
    } as unknown as TrackGroup;
    const track = makeTrack();
    expect(isTrackOwnedOrPreview(track, makeUser(7), trackGroup)).toBe(false);
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
