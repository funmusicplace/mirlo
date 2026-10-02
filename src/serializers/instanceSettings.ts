import { SettingsType, resolveInstanceName } from "../utils/settings";
import { AvailableLanguage } from "../utils/transifexLanguages";
import { resolveTrustLevelNames } from "../utils/trustLevel";

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
};

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const colorOrDefault = (
  value: string | undefined,
  key: keyof typeof DEFAULT_INSTANCE_COLORS
) =>
  value && HEX_COLOR_REGEX.test(value.trim())
    ? value.trim()
    : DEFAULT_INSTANCE_COLORS[key];

export const serializeInstanceSettings = (
  settings: SettingsType,
  languages?: AvailableLanguage[]
): InstanceSettings => {
  const customization = settings.settings?.instanceCustomization;
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
  };
};
