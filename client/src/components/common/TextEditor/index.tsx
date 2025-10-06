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

type UsePastedImageUploadArgs = {
  manager: { view: any };
  postId?: number;
  reloadImages?: () => void;
  setState: ReturnType<typeof useRemirror>["setState"];
  onChange: (html: string) => void;
};

export const usePastedImageUpload = ({
  manager,
  postId,
  reloadImages,
  setState,
  onChange,
}: UsePastedImageUploadArgs) => {
  const processedPastedImagesRef = useRef<Map<string, string>>(new Map());
  const uploadingPastedImagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    processedPastedImagesRef.current.clear();
    uploadingPastedImagesRef.current.clear();
  }, [postId]);

  const dataUriToFile = useCallback(async (dataUri: string, index: number) => {
    const response = await fetch(dataUri);
    const blob = await response.blob();

    const mimeFromBlob = blob.type;
    const mimeFromUri = dataUri.match(/^data:(.*?)(;|,)/)?.[1];
    const mimeType = mimeFromBlob || mimeFromUri || "application/octet-stream";

    const extensionMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };

    const fallbackExtension = mimeType.includes("/")
      ? mimeType.split("/")[1]?.split("+")[0]
      : undefined;
    const extension = extensionMap[mimeType] ?? fallbackExtension ?? "bin";

    return new File([blob], `pasted-image-${Date.now()}-${index}.${extension}`, {
      type: mimeType,
    });
  }, []);

  const imageWithSrcExists = useCallback(
    (src: string) => {
      const view = manager.view;
      if (!view) {
        return false;
      }

      let found = false;
      view.state.doc.descendants((node: any) => {
        if (found || node.type.name !== "image") {
          return;
        }

        const nodeSrc: unknown = node.attrs.src;
        if (typeof nodeSrc === "string" && nodeSrc === src) {
          found = true;
        }
      });

      return found;
    },
    [manager]
  );

  const replaceImageSources = useCallback(
    (replacements: Map<string, string>) => {
      const view = manager.view;
      if (!view || replacements.size === 0) {
        return;
      }

      const { state } = view;
      let tr = state.tr;
      let hasChanges = false;

      state.doc.descendants((node: any, pos: number) => {
        if (node.type.name !== "image") {
          return;
        }

        const src: unknown = node.attrs.src;
        if (typeof src !== "string") {
          return;
        }

        const replacement = replacements.get(src);
        if (!replacement) {
          return;
        }

        tr = tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: replacement,
        });
        hasChanges = true;
      });

      if (hasChanges) {
        view.dispatch(tr);

        const updatedView = manager.view;
        if (!updatedView) {
          return;
        }

        const html = prosemirrorNodeToHtml((updatedView.state as any).doc);
        setState(updatedView.state as any);
        onChange(html);
      }
    },
    [manager, onChange, setState]
  );

  const uploadPastedImages = useCallback(async () => {
    if (!postId) {
      return;
    }

    const view = manager.view;
    if (!view) {
      return;
    }

    const dataUriSrcs: string[] = [];
    view.state.doc.descendants((node: any) => {
      if (node.type.name !== "image") {
        return;
      }

      const src: unknown = node.attrs.src;
      if (typeof src === "string" && src.startsWith("data:image")) {
        dataUriSrcs.push(src);
      }
    });

    if (dataUriSrcs.length === 0) {
      return;
    }

    const replacements = new Map<string, string>();
    let shouldReloadImages = false;

    for (const [index, src] of Array.from(new Set(dataUriSrcs)).entries()) {
      if (!imageWithSrcExists(src)) {
        continue;
      }

      const cachedResult = processedPastedImagesRef.current.get(src);
      if (cachedResult) {
        replacements.set(src, cachedResult);
        continue;
      }

      if (uploadingPastedImagesRef.current.has(src)) {
        continue;
      }

      try {
        uploadingPastedImagesRef.current.add(src);
        const file = await dataUriToFile(src, index);
        const response = await api.uploadFile(
          `manage/posts/${postId}/images`,
          [file]
        );

        if (!imageWithSrcExists(src)) {
          processedPastedImagesRef.current.delete(src);
          continue;
        }

        processedPastedImagesRef.current.set(src, response.result.jobId);
        replacements.set(src, response.result.jobId);
        shouldReloadImages = true;
      } catch (error) {
        console.error("Failed to upload pasted image", error);
        processedPastedImagesRef.current.delete(src);
      } finally {
        uploadingPastedImagesRef.current.delete(src);
      }
    }

    if (replacements.size > 0) {
      replaceImageSources(replacements);

      if (shouldReloadImages) {
        reloadImages?.();
      }
    }
  }, [
    dataUriToFile,
    imageWithSrcExists,
    manager,
    postId,
    reloadImages,
    replaceImageSources,
  ]);

  useEffect(() => {
    const view = manager.view;
    if (!view) {
      return;
    }

    const handlePaste = () => {
      window.setTimeout(() => {
        void uploadPastedImages();
      }, 0);
    };

    view.dom.addEventListener("paste", handlePaste);

    return () => {
      view.dom.removeEventListener("paste", handlePaste);
    };
  }, [manager, uploadPastedImages]);

  return uploadPastedImages;
};

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
  const uploadPastedImages = usePastedImageUpload({
    manager,
    postId,
    reloadImages,
    setState,
    onChange,
  });

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
          void uploadPastedImages();
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
