export interface FormSettings {
  platformPercent?: number;
  cdnUrl?: string;
  terms?: string;
  privacyPolicy?: string;
  cookiePolicy?: string;
  contentPolicy?: string;
  instanceCustomization?: SettingsFromAPI["settings"]["instanceCustomization"];
  stripe?: SettingsFromAPI["settings"]["stripe"];
  isClosedToPublicArtistSignup?: boolean;
  showQueueDashboard?: boolean;
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
      publishableKey?: string;
      webhookSigningSecret?: string;
      webhookConnectSigningSecret?: string;
      webhookSecretConfigured?: boolean;
      webhookEndpointId?: string;
    };
    emailProvider?: {
      provider?: "sendgrid" | "mailgun" | "postmark" | "smtp";
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
      smtp?: {
        host?: string;
        port?: number;
        secure?: boolean;
        user?: string;
        password?: string;
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

export const settingsToForm = (
  settings: Partial<SettingsFromAPI>,
  trustLevelNames: string[]
): FormSettings => ({
  isClosedToPublicArtistSignup: settings.isClosedToPublicArtistSignup,
  showQueueDashboard: settings.showQueueDashboard,
  platformPercent: settings.settings?.platformPercent,
  cdnUrl: settings.cdnUrl,
  instanceCustomization: {
    ...settings.settings?.instanceCustomization,
    colors: {
      button: "#be3455",
      buttonText: "#ffffff",
      background: "#ffffff",
      text: "#000000",
      ...settings.settings?.instanceCustomization?.colors,
    },
  },
  stripe: {
    ...settings.settings?.stripe,
    key: "",
  },
  emailProvider: {
    ...settings.settings?.emailProvider,
  },
  useConsolidatedBuckets: settings.bucketNames != null,
  bucketPrefix: settings.bucketNames?.prefix ?? "",
  cloudflareTurnstileSecret: settings.settings?.cloudflareTurnstileSecret,
  terms: settings.terms,
  privacyPolicy: settings.privacyPolicy,
  cookiePolicy: settings.cookiePolicy,
  contentPolicy: settings.contentPolicy,
  defconLevel: settings.defconLevel,
  trustLevelNames: trustLevelNames.map(
    (defaultName, level) =>
      settings.settings?.trustLevelNames?.[level]?.trim() || defaultName
  ),
});

export const formToSettingsPayload = (
  data: Partial<FormSettings>,
  featuredArtistIds: number[]
) => ({
  settings: {
    platformPercent: data.platformPercent,
    instanceCustomization: {
      ...data.instanceCustomization,
    },
    stripe: {
      ...data.stripe,
    },
    emailProvider: {
      ...data.emailProvider,
    },
    cloudflareTurnstileSecret: data.cloudflareTurnstileSecret,
    featuredArtistIds,
    trustLevelNames: data.trustLevelNames,
  },
  cdnUrl: data.cdnUrl,
  bucketNames: data.useConsolidatedBuckets
    ? { prefix: data.bucketPrefix ?? "" }
    : null,
  terms: data.terms,
  showQueueDashboard: data.showQueueDashboard,
  isClosedToPublicArtistSignup: data.isClosedToPublicArtistSignup,
  privacyPolicy: data.privacyPolicy,
  cookiePolicy: data.cookiePolicy,
  contentPolicy: data.contentPolicy,
  defconLevel: Number(data.defconLevel),
});
