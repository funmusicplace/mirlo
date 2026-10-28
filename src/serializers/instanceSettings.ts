import { addSizesToStoredImage } from "../utils/artist";
import {
  SettingsType,
  SetupStage,
  resolveContactEmail,
  resolveInstanceName,
  resolveSetupStage,
  resolveSupportEmail,
} from "../utils/settings";
import {
  SplashTextPosition,
  isSplashTextPosition,
} from "../utils/splashScreen";
import { AvailableLanguage } from "../utils/transifexLanguages";
import { resolveTrustLevelNames } from "../utils/trustLevel";

import { SerializedInstanceLogo, serializeInstanceLogo } from "./instanceLogo";

export const DEFAULT_INSTANCE_COLORS = {
  button: "#be3455",
  buttonText: "#ffffff",
  background: "#ffffff",
  text: "#000000",
};

export type InstanceSettings = {
  name: string;
  colors: typeof DEFAULT_INSTANCE_COLORS;
  showHeroOnHome: boolean;
  isClosedToPublicArtistSignup: boolean;
  trustLevelNames: string[];
  languages: AvailableLanguage[] | null;
  setupStage: SetupStage;
  stripePublishableKey: string | null;
  contactEmail: string | null;
  supportEmail: string | null;
  logo: SerializedInstanceLogo | null;
  mobileLogo: SerializedInstanceLogo | null;
  tintLogo: boolean;
  showCustomSplash: boolean;
  splashImage: { sizes: Record<string, string> } | null;
  splashTitle: string | null;
  splashSubtitle: string | null;
  splashTextPosition: SplashTextPosition;
};

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const colorOrDefault = (
  value: string | undefined,
  key: keyof typeof DEFAULT_INSTANCE_COLORS
) =>
  value && HEX_COLOR_REGEX.test(value.trim())
    ? value.trim()
    : DEFAULT_INSTANCE_COLORS[key];

const serializeSplashImage = (image: SettingsType["splashImage"]) =>
  image?.url.length ? { sizes: addSizesToStoredImage(image)!.sizes } : null;

export const serializeInstanceSettings = (
  settings: SettingsType,
  languages?: AvailableLanguage[]
): InstanceSettings => {
  const customization = settings.settings?.instanceCustomization;
  const splashTextPosition = customization?.splashTextPosition;
  return {
    name: resolveInstanceName(settings),
    colors: {
      button: colorOrDefault(customization?.colors?.button, "button"),
      buttonText: colorOrDefault(
        customization?.colors?.buttonText,
        "buttonText"
      ),
      background: colorOrDefault(
        customization?.colors?.background,
        "background"
      ),
      text: colorOrDefault(customization?.colors?.text, "text"),
    },
    showHeroOnHome: customization?.showHeroOnHome ?? false,
    isClosedToPublicArtistSignup:
      settings.isClosedToPublicArtistSignup ?? false,
    trustLevelNames: resolveTrustLevelNames(settings.settings?.trustLevelNames),
    languages: languages ?? null,
    setupStage: resolveSetupStage(settings),
    stripePublishableKey:
      settings.settings?.stripe?.publishableKey?.trim() || null,
    contactEmail: resolveContactEmail(settings),
    supportEmail: resolveSupportEmail(settings),
    logo: serializeInstanceLogo(settings.logo),
    mobileLogo: serializeInstanceLogo(settings.mobileLogo),
    tintLogo: customization?.tintLogo === true,
    showCustomSplash:
      customization?.showHeroOnHome === true &&
      customization?.showCustomSplash === true,
    splashImage: serializeSplashImage(settings.splashImage),
    splashTitle: customization?.splashTitle || null,
    splashSubtitle: customization?.splashSubtitle || null,
    splashTextPosition: isSplashTextPosition(splashTextPosition)
      ? splashTextPosition
      : "center",
  };
};
