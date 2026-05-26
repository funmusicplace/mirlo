import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => opts?.url ?? key,
    i18n: { language: "en" },
  }),
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

const mockApiGet = vi.fn();
vi.mock("services/api", () => ({
  default: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import type { PostFormData } from "./PostForm";
import PostSlugField from "./PostSlugField";

// ---- fixtures ---------------------------------------------------------------

const baseArtist = {
  id: 1,
  urlSlug: "test-artist",
  name: "Test Artist",
} as Artist;

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 10,
    title: "My Post",
    content: "",
    urlSlug: "my-post",
    isPublic: true,
    isDraft: true,
    publishedAt: new Date().toISOString(),
    artistId: 1,
    isContentHidden: false,
    ...overrides,
  } as Post;
}

// ---- helpers ----------------------------------------------------------------

function Wrapper({ post, artist }: { post: Post; artist: Artist }) {
  const methods = useForm<PostFormData>({
    defaultValues: { urlSlug: post.urlSlug },
    mode: "onBlur",
  });
  return (
    <FormProvider {...methods}>
      <PostSlugField post={post} artist={artist} />
    </FormProvider>
  );
}

// ---- tests ------------------------------------------------------------------

describe("PostSlugField", () => {
  describe("when post has no urlSlug", () => {
    test("renders nothing", () => {
      const { container } = render(
        <Wrapper post={makePost({ urlSlug: undefined })} artist={baseArtist} />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("when post has a urlSlug", () => {
    test("shows the full post URL", () => {
      render(<Wrapper post={makePost()} artist={baseArtist} />);
      expect(
        screen.getByText(/test-artist\/posts\/my-post/)
      ).toBeInTheDocument();
    });

    test("shows the 'changeSlug' button", () => {
      render(<Wrapper post={makePost()} artist={baseArtist} />);
      expect(
        screen.getByRole("button", { name: "changeSlug" })
      ).toBeInTheDocument();
    });

    test("does not show the slug input by default", () => {
      render(<Wrapper post={makePost()} artist={baseArtist} />);
      expect(screen.queryByLabelText("urlSlug")).toBeNull();
    });
  });

  describe("when 'changeSlug' is clicked", () => {
    test("shows the slug input", async () => {
      render(<Wrapper post={makePost()} artist={baseArtist} />);
      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));
      expect(screen.getByLabelText("urlSlug")).toBeInTheDocument();
    });

    test("hides the URL info text", async () => {
      render(<Wrapper post={makePost()} artist={baseArtist} />);
      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));
      expect(screen.queryByRole("button", { name: "changeSlug" })).toBeNull();
    });

    test("shows slugWarning hint text", async () => {
      render(<Wrapper post={makePost()} artist={baseArtist} />);
      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));
      expect(screen.getByText("slugWarning")).toBeInTheDocument();
    });
  });

  describe("slug uniqueness validation", () => {
    test("shows an error when the slug is already taken", async () => {
      mockApiGet.mockResolvedValue({ result: { exists: true } });

      render(<Wrapper post={makePost()} artist={baseArtist} />);
      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));

      const input = screen.getByLabelText("urlSlug");
      await userEvent.clear(input);
      await userEvent.type(input, "taken-slug");
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText("slugTaken")).toBeInTheDocument();
      });
    });

    test("does not show an error when the slug is available", async () => {
      mockApiGet.mockResolvedValue({ result: { exists: false } });

      render(<Wrapper post={makePost()} artist={baseArtist} />);
      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));

      const input = screen.getByLabelText("urlSlug");
      await userEvent.clear(input);
      await userEvent.type(input, "available-slug");
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.queryByText("slugTaken")).toBeNull();
      });
    });

    test("calls the testExistence endpoint with the correct params", async () => {
      mockApiGet.mockResolvedValue({ result: { exists: false } });

      render(<Wrapper post={makePost()} artist={baseArtist} />);
      await userEvent.click(screen.getByRole("button", { name: "changeSlug" }));

      const input = screen.getByLabelText("urlSlug");
      await userEvent.clear(input);
      await userEvent.type(input, "new-slug");
      await userEvent.tab();

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          "manage/posts/testExistence?urlSlug=new-slug&artistId=1&forPostId=10"
        );
      });
    });
  });
});
