import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import api from "services/api";
import { beforeEach, describe, expect, test, vi, Mock } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ trackGroupId: "5" }),
}));

vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: { id: 1 } }),
}));

vi.mock("services/api", () => ({
  default: {
    put: vi.fn(() => Promise.resolve({})),
    getMany: vi.fn(() => Promise.resolve({ results: [] })),
  },
}));

// The AutoComplete is exercised separately; here we just need a way to fire its
// `onSelect` with a controllable value to drive ManageTags' tag-splitting logic.
const hoisted = vi.hoisted(() => ({ selectValue: "" }));
vi.mock("components/common/AutoComplete", () => ({
  default: ({ onSelect }: { onSelect: (value: unknown) => void }) => (
    <button type="button" onClick={() => onSelect({ id: hoisted.selectValue })}>
      select-tag
    </button>
  ),
}));

vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: (props: { "aria-label"?: string; onClick?: () => void }) => (
    <button
      type="button"
      aria-label={props["aria-label"]}
      onClick={props.onClick}
    />
  ),
}));

import ManageTags from "./ManageTags";

const apiPut = api.put as unknown as Mock;

describe("ManageTags", () => {
  beforeEach(() => {
    apiPut.mockClear();
  });

  test("splits a comma-separated value into separate tags", async () => {
    hoisted.selectValue = "test1,test2,test3";
    render(<ManageTags />);

    await userEvent.click(screen.getByText("select-tag"));

    expect(screen.getByText("test1")).toBeInTheDocument();
    expect(screen.getByText("test2")).toBeInTheDocument();
    expect(screen.getByText("test3")).toBeInTheDocument();

    await waitFor(() =>
      expect(apiPut).toHaveBeenCalledWith("manage/trackGroups/5/tags", [
        "test1",
        "test2",
        "test3",
      ])
    );
  });

  test("trims whitespace and replaces spaces within a tag with hyphens", async () => {
    hoisted.selectValue = " ambient , field recording ";
    render(<ManageTags />);

    await userEvent.click(screen.getByText("select-tag"));

    await waitFor(() =>
      expect(apiPut).toHaveBeenCalledWith("manage/trackGroups/5/tags", [
        "ambient",
        "field-recording",
      ])
    );
  });

  test("lowercases tags to match how the API stores them", async () => {
    hoisted.selectValue = "Ambient, Field Recording";
    render(<ManageTags />);

    await userEvent.click(screen.getByText("select-tag"));

    expect(screen.getByText("ambient")).toBeInTheDocument();
    expect(screen.getByText("field-recording")).toBeInTheDocument();

    await waitFor(() =>
      expect(apiPut).toHaveBeenCalledWith("manage/trackGroups/5/tags", [
        "ambient",
        "field-recording",
      ])
    );
  });

  test("ignores empty entries from trailing/duplicate commas", async () => {
    hoisted.selectValue = "noise,,";
    render(<ManageTags />);

    await userEvent.click(screen.getByText("select-tag"));

    await waitFor(() =>
      expect(apiPut).toHaveBeenCalledWith("manage/trackGroups/5/tags", [
        "noise",
      ])
    );
  });

  test("appends to existing tags without duplicating", async () => {
    hoisted.selectValue = "noise,ambient";
    render(<ManageTags tags={["ambient"]} />);

    await userEvent.click(screen.getByText("select-tag"));

    await waitFor(() =>
      expect(apiPut).toHaveBeenCalledWith("manage/trackGroups/5/tags", [
        "ambient",
        "noise",
      ])
    );
  });
});
