import React, { useCallback } from "react";
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
  new IframeExtension(),
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

  return (
    <div
      className={
        `remirror-theme ` +
        css`
          p {
            margin-bottom: 1rem;
          }
          width: 100%;

          .remirror-editor {
            width: 100%;
            .ProseMirror {
              border: 1px solid var(--mi-darken-x-background-color);
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
          // Update the state to the latest value.
          onChange(prosemirrorNodeToHtml(parameter.state.doc));
          setState(parameter.state);
        }}
      >
        <TopToolbar postId={postId} artistId={artistId} />
        <EditorComponent />
        {/* <BubbleMenu /> */}
        <TableComponents />
        <FloatingLinkToolbar />
      </Remirror>
    </div>
  );
};

export default TextEditor;
