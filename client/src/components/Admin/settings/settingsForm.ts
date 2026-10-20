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
  cloudflareTurnstileSecretConfigured?: boolean;
  defconLevel?: number;
  bucketPrefix?: string;
  trustLevelNames?: string[];
  pendingLogo?: File | null;
  pendingMobileLogo?: File | null;
}

export const LOGO_FIELDS = {
  main: {
    name: "pendingLogo",
    savedKey: "logo",
    id: "instance-logo",
    labelKey: "instanceLogo",
    hintKey: "instanceLogoHint",
    uploadKey: "uploadInstanceLogo",
    replaceKey: "replaceInstanceLogo",
    removeKey: "removeInstanceLogo",
    savedCaptionKey: "instanceLogoSavedCaption",
    pendingCaptionKey: "instanceLogoPendingCaption",
  },
  mobile: {
    name: "pendingMobileLogo",
    savedKey: "mobileLogo",
    id: "instance-mobile-logo",
    labelKey: "instanceMobileLogo",
    hintKey: "instanceMobileLogoHint",
    uploadKey: "uploadInstanceMobileLogo",
    replaceKey: "replaceInstanceMobileLogo",
    removeKey: undefined,
    savedCaptionKey: "instanceMobileLogoSavedCaption",
    pendingCaptionKey: "instanceMobileLogoPendingCaption",
  },
} as const;

export type LogoKind = keyof typeof LOGO_FIELDS;

export const SETTINGS_SECTIONS = [
  { id: "settings-identity", labelKey: "sectionIdentity" },
  { id: "settings-general", labelKey: "sectionGeneral" },
  { id: "settings-platform-policy", labelKey: "sectionPlatformPolicy" },
  { id: "settings-featured-artists", labelKey: "sectionFeaturedArtists" },
  { id: "settings-stripe", labelKey: "sectionStripe" },
  { id: "settings-email", labelKey: "sectionEmail" },
  { id: "settings-storage", labelKey: "sectionStorage" },
  { id: "settings-policies", labelKey: "sectionPolicies" },
  { id: "settings-trust-levels", labelKey: "sectionTrustLevels" },
  { id: "settings-security", labelKey: "sectionSecurity" },
] as const;

export const settingsToForm = (
  settings: Partial<SettingsFromAPI>,
  trustLevelNames: string[]
): FormSettings => ({
  isClosedToPublicArtistSignup: settings.isClosedToPublicArtistSignup ?? false,
  showQueueDashboard: settings.showQueueDashboard ?? false,
  platformPercent: settings.settings?.platformPercent,
  cdnUrl: settings.cdnUrl ?? "",
  instanceCustomization: {
    ...settings.settings?.instanceCustomization,
    title: settings.settings?.instanceCustomization?.title ?? "",
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
    publishableKey: settings.settings?.stripe?.publishableKey ?? "",
    webhookConnectSigningSecret: "",
  },
  emailProvider: {
    ...settings.settings?.emailProvider,
    fromEmail: settings.settings?.emailProvider?.fromEmail ?? "",
  },
  bucketPrefix: settings.bucketNames?.prefix ?? "",
  cloudflareTurnstileSecret: "",
  cloudflareTurnstileSecretConfigured:
    settings.settings?.cloudflareTurnstileSecretConfigured,
  terms: settings.terms ?? "",
  privacyPolicy: settings.privacyPolicy ?? "",
  cookiePolicy: settings.cookiePolicy ?? "",
  contentPolicy: settings.contentPolicy ?? "",
  defconLevel: settings.defconLevel ?? 0,
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
      "keyMode",
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
  bucketNames: { prefix: data.bucketPrefix ?? "" },
  terms: data.terms,
  showQueueDashboard: data.showQueueDashboard,
  isClosedToPublicArtistSignup: data.isClosedToPublicArtistSignup,
  privacyPolicy: data.privacyPolicy,
  cookiePolicy: data.cookiePolicy,
  contentPolicy: data.contentPolicy,
  defconLevel: Number(data.defconLevel),
});
