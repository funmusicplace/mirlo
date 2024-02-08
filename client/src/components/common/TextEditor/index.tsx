import React from "react";
import {
  PlaceholderExtension,
  TableExtension,
  ImageExtension,
  wysiwygPreset,
  DropCursorExtension,
  IframeExtension,
} from "remirror/extensions";
import { EditorComponent, Remirror, useRemirror } from "@remirror/react";
import "remirror/styles/all.css";
import { css } from "@emotion/css";

import { FloatingToolbar, TableComponents } from "@remirror/react";
import { prosemirrorNodeToHtml } from "@remirror/core-utils";

import TopToolbar from "./TopToolbar";

/**
 * Bubble menu for the pre-packaged editors
 */
export const BubbleMenu: React.FC = () => <FloatingToolbar />;

const extensions = () => [
  new PlaceholderExtension({ placeholder: "Type something" }),
  new TableExtension(),
  new DropCursorExtension(),
  new ImageExtension(),
  new IframeExtension(),
  ...wysiwygPreset(),
];

const TextEditor: React.FC<{ onChange: (val: any) => void; value: string }> = ({
  onChange,
  value,
}) => {
  const { manager, state, setState } = useRemirror({
    extensions,
    content: value,
    // content: "",
    stringHandler: "html",

    selection: "end",
  });

  return (
    <div
      className={
        // `remirror-theme ` +
        css`
          width: 100%;

          p {
            margin-bottom: 1rem;
          }

          .remirror-editor {
            padding: 1rem;
            background-color: var(--mi-lighten-x-background-color);

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
        <TopToolbar />
        <EditorComponent />
        <BubbleMenu />
        <TableComponents />
      </Remirror>
    </div>
  );
};

export default TextEditor;
