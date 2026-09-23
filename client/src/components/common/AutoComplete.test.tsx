import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/" }),
}));

import AutoComplete from "./AutoComplete";

const renderAutoComplete = (
  props: Partial<React.ComponentProps<typeof AutoComplete>> = {}
) => {
  const onSelect = vi.fn();
  render(
    <AutoComplete
      id="input-test"
      getOptions={() => []}
      onSelect={onSelect}
      {...props}
    />
  );
  return { onSelect, input: screen.getByRole("searchbox") };
};

describe("AutoComplete", () => {
  test("commits the text before a typed comma when commitOnComma is set", async () => {
    const { onSelect, input } = renderAutoComplete({ commitOnComma: true });

    await userEvent.type(input, "ambient,");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      id: "ambient",
      name: "ambient",
      isNew: true,
    });
    // What came after the comma stays behind for the next value.
    await waitFor(() => expect(input).toHaveValue(""));
  });

  test("keeps typing after a comma in the input", async () => {
    const { onSelect, input } = renderAutoComplete({ commitOnComma: true });

    await userEvent.type(input, "ambient,drone");

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(input).toHaveValue("drone"));
  });

  test("commits every entry when a comma-separated list is pasted", async () => {
    const { onSelect, input } = renderAutoComplete({ commitOnComma: true });

    await userEvent.click(input);
    await userEvent.paste("ambient, drone,");

    expect(onSelect.mock.calls.map(([value]) => value)).toEqual([
      { id: "ambient", name: "ambient", isNew: true },
      { id: "drone", name: "drone", isNew: true },
    ]);
  });

  test("ignores empty entries between repeated commas", async () => {
    const { onSelect, input } = renderAutoComplete({ commitOnComma: true });

    await userEvent.click(input);
    await userEvent.paste("noise,,,");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      id: "noise",
      name: "noise",
      isNew: true,
    });
  });

  test("leaves commas alone when commitOnComma is not set", async () => {
    // Locations and artist names legitimately contain commas, so the default
    // has to keep them in the search value.
    const { onSelect, input } = renderAutoComplete();

    await userEvent.type(input, "Portland, Oregon");

    expect(onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(input).toHaveValue("Portland, Oregon"));
  });
});
