import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => opts?.url ?? key,
    i18n: { language: "en" },
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { results: [] } }),
}));

vi.mock("queries", () => ({
  queryManagedArtistSubscriptionTiers: vi.fn(() => ({
    queryKey: [],
    queryFn: () => null,
  })),
}));

vi.mock("utils/useGetUserObjectById", () => ({
  default: () => ({ objects: [], reload: vi.fn() }),
}));

vi.mock("utils/useFormPersist", () => ({
  useFormPersist: () => ({
    hasRestoredDraft: false,
    discardDraft: vi.fn(),
    dismissBanner: vi.fn(),
    clearDraft: vi.fn(),
  }),
}));

vi.mock("utils/useBodyDraft", () => ({
  useBodyDraft: (_key: string, initial: string) => ({
    content: initial,
    setContent: vi.fn(),
    hasRestoredDraft: false,
    discardDraft: vi.fn(),
    dismissBanner: vi.fn(),
    clearDraft: vi.fn(),
  }),
}));

vi.mock("components/common/TextEditor", () => ({ default: () => null }));
vi.mock("components/common/TextEditor/ImagesInPostManager", () => ({
  default: () => null,
}));
vi.mock("components/common/DraftRestoredBanner", () => ({
  default: () => null,
}));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: ({
    children,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
  }) => (
    <button type={type as "button" | "submit" | "reset"} onClick={onClick}>
      {children}
    </button>
  ),
}));
vi.mock("utils/artist", () => ({
  getArtistManageUrl: vi.fn(() => "/manage/artist/1"),
}));

const mockApiGet = vi.fn();
vi.mock("../../../services/api", () => ({
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    delete: vi.fn(),
  },
}));

vi.mock("./EditPostHeader", () => ({ default: () => null }));

import PostForm from "./PostForm";

// ---- fixtures ---------------------------------------------------------------

const baseArtist: Artist = {
  id: 1,
  urlSlug: "test-artist",
  name: "Test Artist",
} as Artist;

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 10,
    title: "My Post",
    content: "<p>Hello</p>",
    urlSlug: "my-post",
    isPublic: true,
    isDraft: true,
    publishedAt: new Date().toISOString(),
    artistId: 1,
    isContentHidden: false,
    ...overrides,
  } as Post;
}

// ---- tests ------------------------------------------------------------------

describe("PostForm", () => {
  describe("URL slug display", () => {
    test("shows the post URL when the post has a urlSlug", () => {
      render(
        <PostForm
          post={makePost({ urlSlug: "my-post" })}
          artist={baseArtist}
          reload={() => Promise.resolve()}
        />
      );
      // The t() mock returns opts.url when present, which will be the full URL
      expect(
        screen.getByText(/test-artist\/posts\/my-post/)
      ).toBeInTheDocument();
    });

    test("shows the 'click here to change' button when the post has a urlSlug", () => {
      render(
        <PostForm
          post={makePost({ urlSlug: "my-post" })}
          artist={baseArtist}
          reload={() => Promise.resolve()}
        />
      );
      expect(
        screen.getByRole("button", { name: "changeSlug" })
      ).toBeInTheDocument();
    });

    test("does not show the URL info text when the post has no urlSlug", () => {
      render(
        <PostForm
          post={makePost({ urlSlug: undefined })}
          artist={baseArtist}
          reload={() => Promise.resolve()}
        />
      );
      expect(screen.queryByRole("button", { name: "changeSlug" })).toBeNull();
    });

    test("does not show the slug input by default", () => {
      render(
        <PostForm
          post={makePost({ urlSlug: "my-post" })}
          artist={baseArtist}
          reload={() => Promise.resolve()}
        />
      );
      expect(screen.queryByLabelText("urlSlug")).toBeNull();
    });
  });

  describe("editing the slug", () => {
    test("shows the slug input after clicking 'click here to change'", async () => {
      render(
        <PostForm
          post={makePost({ urlSlug: "my-post" })}
          artist={baseArtist}
          reload={() => Promise.resolve()}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));
      expect(screen.getByLabelText("urlSlug")).toBeInTheDocument();
    });

    test("hides the URL info text after clicking 'click here to change'", async () => {
      render(
        <PostForm
          post={makePost({ urlSlug: "my-post" })}
          artist={baseArtist}
          reload={() => Promise.resolve()}
        />
      );
      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));
      expect(screen.queryByRole("button", { name: "changeSlug" })).toBeNull();
    });

    test("shows a uniqueness error when the slug is already taken", async () => {
      mockApiGet.mockResolvedValue({ result: { exists: true } });

      render(
        <PostForm
          post={makePost({ urlSlug: "my-post" })}
          artist={baseArtist}
          reload={() => Promise.resolve()}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));
      const input = screen.getByLabelText("urlSlug");
      await userEvent.clear(input);
      await userEvent.type(input, "taken-slug");
      // Trigger validation by tabbing away
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText("slugTaken")).toBeInTheDocument();
      });
    });

    test("does not show an error when the slug is available", async () => {
      mockApiGet.mockResolvedValue({ result: { exists: false } });

      render(
        <PostForm
          post={makePost({ urlSlug: "my-post" })}
          artist={baseArtist}
          reload={() => Promise.resolve()}
        />
      );

      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));
      const input = screen.getByLabelText("urlSlug");
      await userEvent.clear(input);
      await userEvent.type(input, "available-slug");
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.queryByText("slugTaken")).toBeNull();
      });
    });
  });
});
