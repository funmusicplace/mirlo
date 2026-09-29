import { afterEach, describe, expect, it, vi } from "vitest";

const injectLanguages = (languages: unknown) => {
  const script = document.createElement("script");
  script.id = "__MIRLO_LANGUAGES__";
  script.type = "application/json";
  script.textContent = JSON.stringify({ languages });
  document.head.appendChild(script);
};

const loadI18n = async () => {
  vi.resetModules();
  return import("./i18n");
};

describe("i18n language list", () => {
  afterEach(() => {
    document.getElementById("__MIRLO_LANGUAGES__")?.remove();
  });

  it("falls back to the built-in list when nothing is injected", async () => {
    const { finishedLanguages } = await loadI18n();
    expect(finishedLanguages.map((l) => l.short)).toEqual([
      "en",
      "fr",
      "es",
      "uk",
      "de",
    ]);
  });

  it("uses the injected list, keeping known names and always English", async () => {
    injectLanguages([
      { short: "pt_BR", name: "Português (Brasil)" },
      { short: "uk", name: "українська" },
      { bogus: true },
    ]);
    const { finishedLanguages } = await loadI18n();
    expect(finishedLanguages).toEqual([
      { short: "en", name: "English" },
      { short: "pt_BR", name: "Português (Brasil)" },
      { short: "uk", name: "Українська" },
    ]);
  });

  it("matches browser-style codes to Transifex codes", async () => {
    injectLanguages([
      { short: "en", name: "English" },
      { short: "fr", name: "Français" },
      { short: "pt_BR", name: "Português (Brasil)" },
    ]);
    const { matchLanguage } = await loadI18n();
    expect(matchLanguage("pt-BR")?.short).toBe("pt_BR");
    expect(matchLanguage("pt")?.short).toBe("pt_BR");
    expect(matchLanguage("fr-CA")?.short).toBe("fr");
    expect(matchLanguage("en-US")?.short).toBe("en");
    expect(matchLanguage("ja")).toBeUndefined();
    expect(matchLanguage(undefined)).toBeUndefined();
  });
});
