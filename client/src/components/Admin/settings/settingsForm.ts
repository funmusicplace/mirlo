export interface FormSettings {
  platformPercent: number;
  cdnUrl?: string;
  terms: string;
  privacyPolicy: string;
  cookiePolicy: string;
  contentPolicy: string;
  instanceCustomization?: SettingsFromAPI["settings"]["instanceCustomization"];
  stripe?: SettingsFromAPI["settings"]["stripe"];
  isClosedToPublicArtistSignup: boolean;
  showQueueDashboard: boolean;
  emailProvider?: SettingsFromAPI["settings"]["emailProvider"];
  cloudflareTurnstileSecret?: string;
  defconLevel?: number;
  useConsolidatedBuckets?: boolean;
  bucketPrefix?: string;
  trustLevelNames?: string[];
}

export interface SettingsFromAPI {
  cdnUrl?: string;
  bucketNames?: { prefix: string } | null;
  settings: {
    platformPercent: number;
    instanceCustomization?: {
      colors?: {
        button?: string;
        buttonText?: string;
        background?: string;
        text?: string;
      };
      artistId?: string;
      title?: string;
      supportEmail?: string;
      purchaseEmail?: string;
      showHeroOnHome?: boolean;
    };
    stripe?: {
      key?: string;
      keyConfigured?: boolean;
      webhookSigningSecret?: string;
      webhookConnectSigningSecret?: string;
    };
    emailProvider?: {
      provider?: "sendgrid" | "mailgun" | "postmark";
      fromEmail?: string;
      sendgrid?: {
        apiKey?: string;
      };
      mailgun?: {
        apiKey?: string;
        domain?: string;
      };
      postmark?: {
        apiKey?: string;
      };
    };
    cloudflareTurnstileSecret?: string;
    featuredArtistIds?: number[];
    trustLevelNames?: string[];
  };
  terms: string;
  privacyPolicy: string;
  cookiePolicy: string;
  showQueueDashboard: boolean;
  isClosedToPublicArtistSignup: boolean;
  contentPolicy: string;
  defconLevel: number;
}

export const SETTINGS_SECTIONS = [
  { id: "settings-general", labelKey: "sectionGeneral" },
  { id: "settings-featured-artists", labelKey: "sectionFeaturedArtists" },
  { id: "settings-stripe", labelKey: "sectionStripe" },
  { id: "settings-email-provider", labelKey: "sectionEmailProvider" },
  { id: "settings-storage", labelKey: "sectionStorage" },
  { id: "settings-policies", labelKey: "sectionPolicies" },
  { id: "settings-trust-levels", labelKey: "sectionTrustLevels" },
  { id: "settings-security", labelKey: "sectionSecurity" },
] as const;
