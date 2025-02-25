import React from "react";

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

import InsertVideoButton from "./InsertVideoButton";
import { css } from "@emotion/css";
import InsertMirloWidgetButton from "./InsertMirloWidgetButton";
import InsertImageButton from "./InsertImageButton";

const TopToolbar: React.FC<{ postId?: number; artistId?: number }> = ({
  postId,
  artistId,
}) => {
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
            background-color: var(--mi-primary-color) !important;
            color: var(--mi-secondary-color);
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
        <CommandButtonGroup>
          {/* <Button startIcon={<FaImage />} /> */}
          <InsertVideoButton />
          <InsertMirloWidgetButton postId={postId} artistId={artistId} />
          <InsertImageButton postId={postId} />
        </CommandButtonGroup>
      </Toolbar>
    </div>
  );
};

export default TopToolbar;
