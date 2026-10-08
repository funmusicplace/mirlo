import { SITE_THEME_PROFILE, deriveThemeVariables } from "./themeVariables";
import { DEFAULT_TRUST_LEVEL_NAMES } from "./trustLevel";

export const DEFAULT_INSTANCE_SETTINGS: InstanceSettings = {
  name: "Mirlo",
  colors: {
    button: "#be3455",
    buttonText: "#ffffff",
    background: "#ffffff",
    text: "#000000",
  },
  showHeroOnHome: true,
  isClosedToPublicArtistSignup: false,
  trustLevelNames: DEFAULT_TRUST_LEVEL_NAMES,
  languages: null,
  setupStage: "done",
};

export const applyInstanceStyles = (settings: InstanceSettings) => {
  const { style } = document.documentElement;
  const variables = deriveThemeVariables(settings.colors, SITE_THEME_PROFILE);
  for (const [name, value] of Object.entries(variables)) {
    style.setProperty(name, value);
  }
  style.setProperty(
    "--mi-instance-show-hero-on-home",
    settings.showHeroOnHome ? "flex" : "none"
  );
};
