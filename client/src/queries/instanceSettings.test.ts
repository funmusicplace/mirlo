import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_INSTANCE_SETTINGS } from "../utils/instanceSettings";

import {
  loadInstanceSettings,
  queryInstanceSettings,
} from "./instanceSettings";

const injectInstance = (data: unknown) => {
  const script = document.createElement("script");
  script.id = "__MIRLO_INSTANCE__";
  script.type = "application/json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

const injected = {
  ...DEFAULT_INSTANCE_SETTINGS,
  name: "Nightjar",
  colors: { ...DEFAULT_INSTANCE_SETTINGS.colors, button: "#123456" },
};

describe("loadInstanceSettings", () => {
  afterEach(() => {
    document.getElementById("__MIRLO_INSTANCE__")?.remove();
    vi.mocked(fetch).mockClear();
  });

  it("uses the injected settings without fetching", async () => {
    injectInstance(injected);
    const queryClient = new QueryClient();

    const settings = await loadInstanceSettings(queryClient);

    expect(settings.name).toBe("Nightjar");
    expect(settings.colors.button).toBe("#123456");
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([input]) => String(input).includes("/v1/instance"))
    ).toBe(false);
  });

  it("fetches the settings when nothing is injected", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          result: { ...DEFAULT_INSTANCE_SETTINGS, name: "Fetched" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const queryClient = new QueryClient();

    const settings = await loadInstanceSettings(queryClient);

    expect(settings.name).toBe("Fetched");
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([input]) => String(input).includes("/v1/instance"))
    ).toBe(true);
  });

  it("ignores a malformed injected script and fetches instead", async () => {
    injectInstance({ name: 42 });
    const queryClient = new QueryClient();

    const settings = await loadInstanceSettings(queryClient);

    expect(settings.name).toBe("Mirlo");
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([input]) => String(input).includes("/v1/instance"))
    ).toBe(true);
  });

  it("falls back to the defaults when the fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const settings = await loadInstanceSettings(queryClient);

    expect(settings).toEqual(DEFAULT_INSTANCE_SETTINGS);
    expect(queryClient.getQueryData(queryInstanceSettings().queryKey)).toEqual(
      DEFAULT_INSTANCE_SETTINGS
    );
  });
});
