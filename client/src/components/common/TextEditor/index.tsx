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
import { useTranslation } from "react-i18next";

import { EditorComponent, Remirror, useRemirror } from "@remirror/react";
import "remirror/styles/all.css";
import { css } from "@emotion/css";

import { TableComponents } from "@remirror/react";
import { prosemirrorNodeToHtml } from "@remirror/core-utils";

import TopToolbar from "./TopToolbar";
import FloatingLinkToolbar from "./FloatingLinkToolbar";
import api from "services/api";
import { usePastedImageUpload } from "./usePastedImageUpload";

const extensions =
  (placeholder: string, postId?: number, reload?: () => void) => () => [
    new PlaceholderExtension({ placeholder }),
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
  className?: string;
  disableFloatingToolbar?: boolean;
  basicStyles?: boolean;
}> = ({
  onChange,
  value,
  postId,
  reloadImages,
  artistId,
  className,
  disableFloatingToolbar,
  basicStyles = false,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "textEditor" });
  const { manager, state, setState } = useRemirror({
    extensions: extensions(t("typeSomething").toString(), postId, reloadImages),
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
    if (disableFloatingToolbar) {
      return;
    }

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
  }, [disableFloatingToolbar]);

  const baseClassName = css`
    p {
      margin-bottom: 1rem;
    }
    width: 100%;
    position: relative;

    /* Sticky toolbar styles */
    .sticky-toolbar-container {
      position: ${disableFloatingToolbar ? "static" : "sticky"};
      top: ${disableFloatingToolbar ? "auto" : `${headerHeight}px`};
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
  `;

  const combinedClassName = ["remirror-theme", baseClassName, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={combinedClassName}>
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
          <TopToolbar
            postId={postId}
            artistId={artistId}
            basicStyles={basicStyles}
          />
        </div>
        <EditorComponent />
        <TableComponents />
        <FloatingLinkToolbar />
      </Remirror>
    </div>
  );
};

export default TextEditor;
