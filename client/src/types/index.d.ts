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
  userTrackGroupPurchases?: { trackGroupId: number }[];
  isAdmin: boolean;
  currency?: string;
  wishlist?: {
    userId: number;
    trackGroupId: number;
  }[];
}

interface Track {
  title: string;
  id: number;
  status: "preview" | "must-own";
  artistId: number;
  trackGroup: TrackGroup;
  trackGroupId: number;
  image: Image;
  order: number;
  metadata: { [key: string]: any };
  audio?: {
    url: string;
    createdAt: string;
    duration: number; // in seconds
    uploadState: "STARTED" | "SUCCESS" | "ERROR";
  };
  isPreview: boolean;
  trackArtists?: {
    role?: string;
    artistId?: number;
    artistName?: string;
    isCoAuthor?: boolean;
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
  currency: string;
  credits: string;
  artist?: Artist;
  artistId: number;
  tracks: Track[];
  updatedAt: string;
  createdAt: string;
  tags?: string[];
  cover?: {
    updatedAt: string;
    id: number;
    url: string;
    sizes?: { [key: number]: string };
  };
  minPrice?: number; // in cents
  urlSlug?: string;
  userTrackGroupPurchases?: { userId: number }[];
  userTrackGroupWishlist?: { userId: number }[];
  platformPercent: number;
}

interface Post {
  title: string;
  id: number;
  content: string;
  publishedAt: string;
  artist?: Artist;
  isPublic: boolean;
  artistId?: number;
  isContentHidden: boolean;
}

type ArtistColors = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
};

interface Artist {
  name: string;
  bio: string;
  urlSlug?: string;
  userId: number;
  id: number;
  location?: string;
  enabled: boolean;
  createdAt: string;
  trackGroups: TrackGroup[];
  links?: string[];
  posts: Post[];
  subscriptionTiers: ArtistSubscriptionTier[];
  properties?: {
    colors: ArtistColors;
  };
  banner?: {
    url: string;
    sizes?: { [key: number]: string };
    updatedAt: string;
  };
  avatar?: {
    url: string;
    sizes?: { [key: string]: string };
    updatedAt: string;
  };
}

interface User {
  id: number;
  email: string;
  name?: string;
  artists: Artist[];
  updatedAt: string;
  createdAt: string;
  stripeAccountId?: string;
}

interface UserFromAdmin {
  id: number;
  email: string;
  name?: string;
  artists: Artist[];
  updatedAt: string;
  createdAt: string;
  stripeAccountId?: string;
  currency: string;
  emailConfirmationToken: string;
  isAdmin: boolean;
  receiveMailingList: boolean;
}

interface ArtistSubscriptionTier {
  id: number;
  artistId: number;
  artist: Artist;
  currency: string;
  minAmount?: number;
  name: string;
  description: string;
  isDefaultTier: boolean;
  platformPercent: number;
  allowVariable?: boolean;
}

interface ArtistUserSubscription {
  id: number;
  amount: number;
  currency: string;
  userId: number;
  artistSubscriptionTierId: number;
  artistSubscriptionTier: ArtistSubscriptionTier;
}

interface UserTrackGroupPurchase {
  userId: number;
  user?: User;
  trackGroupId: number;
  trackGroup?: TrackGroup;
  pricePaid: number;
  currencyPaid: string;
  datePurchased: string;
  singleDownloadToken?: string;
}

type AccountStatus = {
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
};
