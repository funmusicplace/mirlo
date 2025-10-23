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
  artists: Artist[];
  artistUserSubscriptions?: ArtistUserSubscription[];
  userTrackGroupPurchases?: { trackGroupId: number }[];
  userTrackPurchases?: { trackId: number }[];
  pledges?: {
    trackGroupId: number;
    trackGroup: { currency: string };
    amount: number;
  }[];
  isAdmin: boolean;
  currency?: string;
  featureFlags?: string[];
  isLabelAccount?: boolean;
  properties?: { tileBackgroundImage?: boolean };
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
  userBanner?: {
    url: string;
    sizes?: { [key: number]: string };
    updatedAt: string;
  };
  canCreateArtists?: boolean;
  merchPurchase?: MerchPurchase[];
}

interface Track {
  title?: string;
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
  urlSlug?: string;
  lyrics?: string;
}

interface Tag {
  tag: string;
}

interface TrackGroup {
  title?: string;
  published: boolean;
  adminEnabled: boolean;
  catalogNumber?: string;
  id: number;
  releaseDate: string;
  publishedAt?: string;
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
  isAllOrNothing?: boolean;
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
  fundraisingGoal?: number;
  fundraisingEndDate?: string;
  downloadableContent?: TrackGroupDownloadableContent[];
  defaultAllowMirloPromo: boolean;
  defaultTrackAllowIndividualSale: boolean;
  defaultTrackMinPrice?: number; // in cents
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
    | "USER_SUBSCRIBED_TO_YOU"
    | "LABEL_ADDED_ARTIST";
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
  iconUrl?: string;
}

interface ArtistLabel {
  artistId: number;
  artist: Artist;
  labelUserId: number;
  labelUser: {
    name: string;
    email: string;
    id: number;
    stripeAccountId?: string;
    userAvatar?: { sizes: string[] };
    artists?: Artist[];
  };
  isLabelApproved: boolean;
  canLabelManageArtist: boolean;
  canLabelAddReleases: boolean;
  isArtistApproved: boolean;
}

interface Artist {
  name: string;
  maxFreePlays?: number;
  shortDescription?: string;
  bio: string;
  isLabelProfile: boolean;
  activityPub: boolean;
  urlSlug?: string;
  userId: number;
  id: number;
  location?: string;
  enabled: boolean;
  createdAt: string;
  defaultPlatformFee?: number;
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
    colors?: ArtistColors;
    tileBackgroundImage?: boolean;
    titles?: {
      releases?: string;
      merch?: string;
      posts?: string;
      support?: string;
      roster?: string;
      groupName?: string;
    };
    emails?: {
      support?: string | null;
      purchase?: string | null;
    };
  };
  user?: Partial<User>;
  banner?: {
    url: string;
    sizes?: { [key: number]: string; original: string };
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

interface Invite {
  id: string;
  email: string;
  createdAt: string;
  usedAt?: string;
  invitedBy?: {
    id: number;
    email: string;
    name?: string;
  };
  invitedById?: number;
  accountType: "ARTIST" | "LISTENER" | "LABEL";
  usedBy: User;
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
  isLabelAccount: boolean;
  featureFlags: string[];
  trustLevel: number;
  canCreateArtists: boolean;
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
  autoPurchaseAlbums?: boolean;
  images: {
    imageId: string;
    image: {
      id: string;
      url: string[];
      sizes: { [key: number]: string };
      updatedAt: string;
    };
  }[];
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

interface UserTransaction {
  userId: number;
  user: User;
  platformCut: number;
  currency: string;
  amount: number;
  createdAt: string;
  id: string;
  trackGroupPurchases?: TrackGroupPurchaseWithTrackGroup[];
  merchPurchases?: MerchPurchaseWithMerch[];
  trackPurchases?: UserTrackPurchase[];
}

interface UserTrackGroupPurchase {
  userId: number;
  user?: User;
  trackGroupId: number;
  trackGroup?: TrackGroup;
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
  stripeAccountId: string;
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
  merchOptionType?: MerchOptionType;
  merchOptionTypeId?: string;
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
  catalogNumber?: string;
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
  optionTypes?: MerchOptionType[];
  downloadableContent?: MerchDownloadableContent[];
}

interface Label {
  id: number;
  name: string;
  urlSlug: string;
  profile: Artist;
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
  options?: MerchOption[];
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

interface DownloadableContent {
  id: number;
  createdAt: string;
  updatedAt: string;
  originalFilename: string;
  trackGroups: TrackGroupDownloadableContent[];
  merch: MerchDownloadableContent[];

  downloadUrl?: string;
}

interface MerchDownloadableContent {
  merchId: string;
  merch: Merch;
  downloadableContentId: number;
  downloadableContent: DownloadableContent;
}

interface TrackGroupDownloadableContent {
  trackGroupId: number;
  trackGroup: TrackGroup;
  downloadableContentId: number;
  downloadableContent: DownloadableContent;
}
