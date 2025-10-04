import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PlaceholderExtension,
  TableExtension,
  ImageExtension,
  wysiwygPreset,
  DropCursorExtension,
  IframeExtension,
  LinkExtension,
  ImageAttributes,
} from "remirror/extensions";
import { CommandFunctionProps, DelayedPromiseCreator } from "@remirror/core";

import { EditorComponent, Remirror, useRemirror } from "@remirror/react";
import "remirror/styles/all.css";
import { css } from "@emotion/css";

import { TableComponents } from "@remirror/react";
import { prosemirrorNodeToHtml } from "@remirror/core-utils";

import TopToolbar from "./TopToolbar";
import FloatingLinkToolbar from "./FloatingLinkToolbar";
import api from "services/api";

const extensions = (postId?: number, reload?: () => void) => () => [
  new PlaceholderExtension({ placeholder: "Type something" }),
  new TableExtension({}),
  new DropCursorExtension({}),
  new ImageExtension({
    uploadHandler: (
      files: { file: File; progress: (progress: number) => void }[]
    ): DelayedPromiseCreator<ImageAttributes>[] => {
      if (postId) {
        return files.map((f) => async (props: CommandFunctionProps) => {
          const response = await api.uploadFile(
            `manage/posts/${postId}/images`,
            [f.file]
          );
          reload?.();
          return { src: response.result.jobId };
        });
      }
      return [];
    },
  }),
  new IframeExtension({ enableResizing: false }),
  new LinkExtension({ autoLink: true, selectTextOnClick: true }),
  ...wysiwygPreset(),
];

const TextEditor: React.FC<{
  onChange: (val: any) => void;
  value: string;
  postId?: number;
  artistId?: number;
  reloadImages?: () => void;
}> = ({ onChange, value, postId, reloadImages, artistId }) => {
  const { manager, state, setState } = useRemirror({
    extensions: extensions(postId, reloadImages),
    content: value,
    stringHandler: "html",
    selection: "end",
  });

  const [headerHeight, setHeaderHeight] = useState(0);
  const processedPastedImagesRef = useRef<Map<string, string>>(new Map());
  const uploadingPastedImagesRef = useRef<Set<string>>(new Set());

  const dataUriToFile = useCallback((dataUri: string, index: number) => {
    const [meta, base64Data] = dataUri.split(",");
    const mimeMatch = meta?.match(/data:(.*?);/);
    const mimeType = mimeMatch?.[1] ?? "image/png";

    const extensionMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };

    const extension = extensionMap[mimeType] ?? "png";

    const byteString = atob(base64Data ?? "");
    const arrayBuffer = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      arrayBuffer[i] = byteString.charCodeAt(i);
    }

    return new File([arrayBuffer], `pasted-image-${Date.now()}-${index}.${extension}`, {
      type: mimeType,
    });
  }, []);

  const uploadPastedImages = useCallback(
    async (html: string) => {
      if (!postId) {
        return;
      }

      if (!html.includes("data:image")) {
        return;
      }

      const parser = document.createElement("div");
      parser.innerHTML = html;

      const images = Array.from(parser.querySelectorAll<HTMLImageElement>("img"));
      const replacements: { original: string; replacement: string }[] = [];
      let shouldReloadImages = false;

      for (const [index, image] of images.entries()) {
        const src = image.getAttribute("src");
        if (!src || !src.startsWith("data:image")) {
          continue;
        }

        const cachedResult = processedPastedImagesRef.current.get(src);
        if (cachedResult) {
          replacements.push({ original: src, replacement: cachedResult });
          continue;
        }

        if (uploadingPastedImagesRef.current.has(src)) {
          continue;
        }

        try {
          uploadingPastedImagesRef.current.add(src);
          const file = dataUriToFile(src, index);
          const response = await api.uploadFile(
            `manage/posts/${postId}/images`,
            [file]
          );

          processedPastedImagesRef.current.set(src, response.result.jobId);
          replacements.push({
            original: src,
            replacement: response.result.jobId,
          });
          shouldReloadImages = true;
        } catch (error) {
          console.error("Failed to upload pasted image", error);
          processedPastedImagesRef.current.delete(src);
        } finally {
          uploadingPastedImagesRef.current.delete(src);
        }
      }

      if (replacements.length > 0) {
        const view = manager.view;
        if (!view) {
          return;
        }

        const currentHtml = prosemirrorNodeToHtml(view.state.doc);
        let sanitizedHtml = currentHtml;
        let hasChanges = false;

        for (const { original, replacement } of replacements) {
          if (sanitizedHtml.includes(original)) {
            sanitizedHtml = sanitizedHtml.split(original).join(replacement);
            hasChanges = true;
          }
        }

        if (!hasChanges) {
          return;
        }

        const newState = manager.createState({
          content: sanitizedHtml,
          selection: "end",
          stringHandler: "html",
        });

        setState(newState);
        onChange(sanitizedHtml);

        if (shouldReloadImages) {
          reloadImages?.();
        }
      }
    },
    [dataUriToFile, manager, onChange, postId, reloadImages, setState]
  );

  useEffect(() => {
    const updateHeaderHeight = () => {
      // Look for visible sticky elements that are actually positioned at the top
      const allElements = document.querySelectorAll("*");
      let validHeader: HTMLElement | null = null;

      for (const element of allElements) {
        const className = element.getAttribute("class");
        if (!className || !className.includes("EditPostHeader")) continue;
        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (rect.top === 0 && rect.height !== 0) {
          validHeader = element as HTMLElement;
          break;
        }
      }

      if (validHeader) {
        const rect = validHeader.getBoundingClientRect();
        setHeaderHeight(rect.bottom);
      } else {
        setHeaderHeight(75); // Fallback value
      }
    };

    // Update initially and on resize
    updateHeaderHeight();

    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    const mutationObserver = new MutationObserver(updateHeaderHeight);

    // Observe document changes
    resizeObserver.observe(document.body);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    window.addEventListener("resize", updateHeaderHeight);
    window.addEventListener("scroll", updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
      window.removeEventListener("scroll", updateHeaderHeight);
    };
  }, []);

  return (
    <div
      className={
        `remirror-theme ` +
        css`
          p {
            margin-bottom: 1rem;
          }
          width: 100%;
          position: relative;

          /* Sticky toolbar styles */
          .sticky-toolbar-container {
            position: sticky;
            top: ${headerHeight}px;
            z-index: 1;
          }

          .remirror-editor {
            width: 100%;
            .ProseMirror {
              border: 1px solid var(--mi-darken-x-background-color);
              border-top: none;
            }

            iframe {
              width: 100%;
            }

            iframe.remirror-iframe-youtube {
              min-height: 390px;
            }

            padding: 1rem;
            background-color: var(--mi-lighten-x-background-color);

            img {
              max-width: 100%;
            }

            ul,
            ol {
              margin-left: 1rem;
              margin-bottom: 1.5rem;
            }

            li > ol,
            li > ul {
              list-style: lower-alpha;
            }
          }
        `
      }
    >
      <Remirror
        manager={manager}
        state={state}
        onChange={(parameter) => {
          const html = prosemirrorNodeToHtml(parameter.state.doc);
          onChange(html);
          setState(parameter.state);
          void uploadPastedImages(html);
        }}
      >
        <div className="sticky-toolbar-container">
          <TopToolbar postId={postId} artistId={artistId} />
        </div>
        <EditorComponent />
        <TableComponents />
        <FloatingLinkToolbar />
      </Remirror>
    </div>
  );
};

export default TextEditor;
