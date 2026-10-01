import { describe, expect, it, vi } from "vitest";

import { DEFAULT_INSTANCE_SETTINGS } from "./utils/instanceSettings";

const loadI18n = async () => {
  vi.resetModules();
  return import("./i18n");
};

const withLanguages = (languages: InstanceSettings["languages"]) => ({
  ...DEFAULT_INSTANCE_SETTINGS,
  languages,
});

describe("i18n language list", () => {
  it("falls back to the built-in list when the instance offers none", async () => {
    const { initI18n, getFinishedLanguages } = await loadI18n();
    await initI18n(withLanguages(null));
    expect(getFinishedLanguages().map((l) => l.short)).toEqual([
      "en",
      "fr",
      "es",
      "uk",
      "de",
    ]);
  });

  it("uses the offered list, keeping known names and always English", async () => {
    const { initI18n, getFinishedLanguages } = await loadI18n();
    await initI18n(
      withLanguages([
        { short: "pt_BR", name: "Português (Brasil)" },
        { short: "uk", name: "українська" },
        { bogus: true } as unknown as { short: string; name: string },
      ])
    );
    expect(getFinishedLanguages()).toEqual([
      { short: "en", name: "English" },
      { short: "pt_BR", name: "Português (Brasil)" },
      { short: "uk", name: "Українська" },
    ]);
  });

  it("matches browser-style codes to Transifex codes", async () => {
    const { initI18n, matchLanguage } = await loadI18n();
    await initI18n(
      withLanguages([
        { short: "en", name: "English" },
        { short: "fr", name: "Français" },
        { short: "pt_BR", name: "Português (Brasil)" },
      ])
    );
    expect(matchLanguage("pt-BR")?.short).toBe("pt_BR");
    expect(matchLanguage("pt")?.short).toBe("pt_BR");
    expect(matchLanguage("fr-CA")?.short).toBe("fr");
    expect(matchLanguage("en-US")?.short).toBe("en");
    expect(matchLanguage("ja")).toBeUndefined();
    expect(matchLanguage(undefined)).toBeUndefined();
  });
});

describe("i18n instance name", () => {
  it("exposes the instance name as a default interpolation variable", async () => {
    const { initI18n, default: i18n } = await loadI18n();
    await initI18n({ ...DEFAULT_INSTANCE_SETTINGS, name: "Nightjar" });
    expect(i18n.options.interpolation?.defaultVariables).toEqual({
      instanceName: "Nightjar",
    });
  });

  it("interpolates the instance name in translations", async () => {
    const { initI18n, default: i18n } = await loadI18n();
    await initI18n({ ...DEFAULT_INSTANCE_SETTINGS, name: "Nightjar" });
    expect(i18n.t("trackDetails.trackOnInstance")).toBe("A track on Nightjar");
    expect(i18n.t("merchDetails.merchByArtist", { artist: "Some Band" })).toBe(
      "Merch by Some Band on Nightjar"
    );
  });

  it("falls back to Mirlo with the default settings", async () => {
    const { initI18n, default: i18n } = await loadI18n();
    await initI18n();
    expect(i18n.t("trackDetails.trackOnInstance")).toBe("A track on Mirlo");
  });
});
