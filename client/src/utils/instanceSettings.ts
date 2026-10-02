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
};

export const applyInstanceStyles = (settings: InstanceSettings) => {
  const { style } = document.documentElement;
  style.setProperty("--mi-instance-button-color", settings.colors.button);
  style.setProperty(
    "--mi-instance-button-text-color",
    settings.colors.buttonText
  );
  style.setProperty(
    "--mi-instance-background-color",
    settings.colors.background
  );
  style.setProperty("--mi-instance-text-color", settings.colors.text);
  style.setProperty(
    "--mi-instance-show-hero-on-home",
    settings.showHeroOnHome ? "flex" : "none"
  );
};
