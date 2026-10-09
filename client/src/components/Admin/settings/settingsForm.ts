import { omit } from "lodash";

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

export const SETTINGS_SECTIONS = [
  { id: "settings-identity", labelKey: "sectionIdentity" },
  { id: "settings-general", labelKey: "sectionGeneral" },
  { id: "settings-platform-policy", labelKey: "sectionPlatformPolicy" },
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
    stripe: omit(data.stripe ?? {}, [
      "keyConfigured",
      "webhookSecretConfigured",
    ]),
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
