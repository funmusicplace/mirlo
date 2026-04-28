import { css } from "@emotion/css";
import {
  BasicFormattingButtonGroup,
  CommandButtonGroup,
  CreateTableButton,
  HeadingLevelButtonGroup,
  ToggleBlockquoteButton,
  ToggleBulletListButton,
  ToggleOrderedListButton,
  Toolbar,
} from "@remirror/react";
import React from "react";

import InsertImageButton from "./InsertImageButton";
import InsertMirloWidgetButton from "./InsertMirloWidgetButton";
import InsertVideoButton from "./InsertVideoButton";

const TopToolbar: React.FC<{
  postId?: number;
  artistId?: number;
  basicStyles?: boolean;
}> = ({ postId, artistId, basicStyles }) => {
  return (
    <div
      className={css`
        background: black;

        > button,
        > div > div > span > button,
        > div > span > button,
        > div > button,
        > div > div > button,
        > span > button {
          background-color: inherit !important;
          color: inherit !important;
          border: none;
          border-radius: 100%;
          height: 2rem;
          width: 2rem;
          padding: 0;

          svg {
            fill: inherit !important;
          }

          &.Mui-disabled {
            border: 0;
          }
          &:hover,
          &.Mui-selected {
            background-color: var(--mi-button-color) !important;
            color: var(--mi-button-text-color);
          }
        }

        @media (prefers-color-scheme: dark) {
          > button,
          > div > div > span > button,
          > div > span > button,
          > div > button,
          > div > div > button,
          > span > button {
            background-color: inherit !important;
            color: var(--mi-black) !important;
          }
        }
      `}
    >
      <Toolbar
        className={css`
          flex-wrap: wrap;
        `}
      >
        <HeadingLevelButtonGroup />
        <BasicFormattingButtonGroup />
        <ToggleBlockquoteButton />
        <CommandButtonGroup>
          <ToggleBulletListButton />
          <ToggleOrderedListButton />
          <CreateTableButton />
        </CommandButtonGroup>
        {!basicStyles && (
          <CommandButtonGroup>
            {/* <Button startIcon={<FaImage />} /> */}
            <InsertVideoButton />
            <InsertMirloWidgetButton postId={postId} artistId={artistId} />
            <InsertImageButton postId={postId} />
          </CommandButtonGroup>
        )}
      </Toolbar>
    </div>
  );
};

export default TopToolbar;
