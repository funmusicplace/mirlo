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
  urlSlug?: string;
  artistUserSubscriptions?: ArtistUserSubscription[];
  userTrackGroupPurchases?: { trackGroupId: number }[];
  userTrackPurchases?: { trackId: number }[];
  isAdmin: boolean;
  currency?: string;
  featureFlags?: string[];
  isLabelAccount?: boolean;
  trackFavorites?: {
    userId: number;
    trackId: number;
    track: Track;
  }[];
  wishlist?: {
    userId: number;
    trackGroupId: number;
  }[];
  language?: string;
  userAvatar?: {
    url: string;
    sizes?: { [key: number]: string };
    updatedAt: string;
  };
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
  allowMirloPromo?: boolean;
  allowIndividualSale: boolean;
  description: string;
  minPrice: number; // in cents;
  metadata: { [key: string]: any };
  audio?: {
    url: string;
    createdAt: string;
    duration: number; // in seconds
    uploadState: "STARTED" | "SUCCESS" | "ERROR";
    originalFilename: string;
  };
  isPreview: boolean;
  trackArtists?: {
    role?: string;
    artistId?: number;
    artistName?: string;
    isCoAuthor?: boolean;
    trackId?: number;
  }[];
  licenseId?: number;
  license?: {
    short: string;
    name: string;
    link?: string;
  };
  isrc?: string;
  lyrics?: string;
}

interface Tag {
  tag: string;
}

interface TrackGroup {
  title: string;
  published: boolean;
  adminEnabled: boolean;
  id: number;
  releaseDate: string;
  about?: string;
  currency: string;
  isGettable: boolean;
  credits?: string;
  artistId?: number;
  artist: Artist;
  tracks: Track[];
  updatedAt: string;
  createdAt: string;
  tags?: string[];
  merch?: Merch[];
  isDraft?: boolean;
  paymentToUserId?: number;
  paymentToUser?: {
    email: string;
    name?: string;
    id: number;
  };
  cover?: {
    updatedAt: string;
    id: string;
    url: string[];
    sizes?: { [key: number]: string };
  };
  minPrice?: number; // in cents
  urlSlug?: string;
  userTrackGroupPurchases?: { userId: number }[];
  userTrackGroupWishlist?: { userId: number }[];
  platformPercent: number;
  isPriceFixed: boolean;
}

interface Post {
  title: string;
  id: number;
  urlSlug?: string;
  content: string;
  publishedAt: string;
  artist?: Artist;
  isPublic: boolean;
  artistId?: number;
  isContentHidden: boolean;
  minimumSubscriptionTierId?: number;
  featuredImageId?: string;
  featuredImage?: { src: string };
  isDraft: boolean;
  tracks?: { postId: number; trackId: number }[];
}

interface PostImage {
  src: string;
  id: string;
  postId: number;
  featuredForPost?: Post[];
}

type ArtistColors = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
};

interface Notification {
  content: string;
  isRead: boolean;
  id: string;
  notificationType:
    | "NEW_ARTIST_POST"
    | "NEW_ARTIST_ALBUM"
    | "USER_BOUGHT_YOUR_ALBUM"
    | "USER_FOLLOWED_YOU"
    | "USER_SUBSCRIBED_TO_YOU";
  post?: Post;
  relatedUser?: User;
  artist?: Artist;
  artistId?: number;
  subscription?: ArtistUserSubscription;
  trackGroup?: TrackGroup & { artist: Artist };
}

interface Link {
  url: string;
  linkType?: string;
  linkLabel?: string;
  inHeader?: boolean;
}

interface ArtistLabel {
  artistId: number;
  artist: Artist;
  labelUserId: number;
  labelUser: {
    name: string;
    email: string;
    id: number;
    userAvatar?: { sizes: string[] };
  };
  isLabelApproved: boolean;
  canLabelManageArtist: boolean;
  canLabelAddReleases: boolean;
  isArtistApproved: boolean;
}

interface Artist {
  name: string;
  bio: string;
  activityPub: boolean;
  urlSlug?: string;
  userId: number;
  id: number;
  location?: string;
  enabled: boolean;
  createdAt: string;
  artistLabels?: ArtistLabel[];
  trackGroups: TrackGroup[];
  links?: string[];
  linksJson?: Link[];
  purchaseEntireCatalogMinPrice?: number;
  posts: Post[];
  tourDates?: {
    date: string;
    location: string;
    ticketsUrl: string;
  }[];
  subscriptionTiers: ArtistSubscriptionTier[];
  properties?: {
    colors: ArtistColors;
  };
  user?: Partial<User>;
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
  merch: Merch[];
}

interface User {
  id: number;
  email: string;
  name?: string;
  artists: Artist[];
  updatedAt: string;
  createdAt: string;
  currency: string;
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
  interval: "MONTH" | "YEAR";
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

interface ArtistUserSubscriptionCharge {
  id: string;
  currency: string;
  amountPaid: number;
  artistUserSubscriptionId: number;
  artistUserSubscription: ArtistUserSubscription;
  createdAt: string;
}

interface UserTrackGroupWishlist {
  userId: number;
  user: User;
  trackGroupId: number;
  trackGroup: TrackGroup;
  createdAt: string;
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

interface UserTrackPurchase {
  userId: number;
  user?: User;
  trackId: number;
  track?: Track;
  pricePaid: number;
  currencyPaid: string;
  datePurchased: string;
}

interface UserArtistTip {
  userId: number;
  artistId: number;
  pricePaid: number;
  currencyPaid: string;
  datePurchased: string;
}

type AccountStatus = {
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
};

interface License {
  id: number;
  short: string;
  link?: string;
}
interface ShippingDestination {
  id: string;
  homeCountry: string;
  destinationCountry: string | null;
  merchId: string;
  costUnit: number;
  currency: string;
  costExtraUnit: number;
}

interface MerchOption {
  name: string;
  quantityRemaining: number;
  sku: string;
  id: string;
  additionalPrice: number;
}

interface MerchOptionType {
  optionName: string;
  id: string;
  options: MerchOption[];
}

interface Merch {
  artistId: number;
  description: string;
  artist: Artist;
  title: string;
  minPrice: number;
  currency: string;
  urlSlug: string | null;
  quantityRemaining: number;
  id: string;
  includePurchaseTrackGroupId?: number | null;
  includePurchaseTrackGroup?: TrackGroup;
  isPublic: boolean;
  images: {
    url: string[];
    updatedAt: string;
    sizes?: { [key: number]: string };
  }[];
  shippingDestinations: ShippingDestination[];
  optionTypes: MerchOptionType[];
}

interface Label {
  id: number;
  name: string;
  urlSlug: string;
}

interface MerchPurchase {
  merchId: string;
  id: string;
  merch: Merch;
  user: User;
  userId: number;
  createdAt: string;
  updatedAt: string;
  quantity: number;
  currencyPaid: string;
  amountPaid: number;
  trackingNumber?: string;
  trackingWebsite?: string;
  fulfillmentStatus: "NO_PROGRESS" | "STARTED" | "SHIPPED" | "COMPLETED";
  shippingAddress: {
    line1: string;
    line2: string;
    postal_code: string;
    city?: string;
    state?: string;
    country?: string;
  };
}
