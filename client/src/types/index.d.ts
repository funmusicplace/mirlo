interface Paginated<T> {
  results: T[];
  limit: number;
  offset: number;
  pages: number;
}

interface LoggedInUser {
  email: string;
  name: string;
  id: number;
  artistUserSubscriptions?: ArtistUserSubscription[];
}

interface Track {
  title: string;
  id: number;
  status: "preview" | "must-own";
  artistId: number;
  trackGroup: TrackGroup;
  trackGroupId: number;
  image: Image;
  audio?: {
    url: string;
    duration: number; // in seconds
  };
  isPreview: boolean;
  trackArtists?: {
    role?: string;
    artistId?: number;
    artistName?: string;
  }[];
}

interface TrackGroup {
  title: string;
  published: boolean;
  adminEnabled: boolean;
  id: number;
  type: "lp" | "ep" | "album" | "single";
  releaseDate: string;
  about: string;
  artist: Artist;
  artistId: number;
  tracks: Track[];
  cover?: { id: number; url: string; sizes?: { [key: number]: string } };
  minPrice?: number; // in cents
  urlSlug?: string;
  userTrackGroupPurchases?: { userId: number }[];
}

interface Post {
  title: string;
  id: number;
  content: string;
  publishedAt: string;
  artist?: Artist;
  forSubscribersOnly: boolean;
}

interface Artist {
  name: string;
  bio: string;
  urlSlug?: string;
  userId: number;
  id: number;
  enabled: boolean;
  trackGroups: TrackGroup[];
  payPalClientId?: string;
  posts: Post[];
  subscriptionTiers: ArtistSubscriptionTier[];
  properties?: { colors: { primary: string; secondary: string } };
  banner?: {
    url: string;
    sizes?: { [key: string]: string };
  };
  avatar?: {
    url: string;
    sizes?: { [key: string]: string };
  };
}

interface User {
  id: number;
  email: string;
  name?: string;
  artists: Artist[];
  updatedAt: string;
}

interface ArtistSubscriptionTier {
  id: number;
  artistId: number;
  artist: Artist;
  minAmount?: number;
  name: string;
  description: string;
}

interface ArtistUserSubscription {
  id: number;
  amount: number;
  artistSubscriptionTierId: number;
  artistSubscriptionTier: ArtistSubscriptionTier;
}

interface UserTrackGroupPurchase {
  userId: number;
  trackGroupId: number;
  trackGroup?: TrackGroup;
  amountPaid: number;
  currency: number;
}

type AccountStatus = {
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
};
