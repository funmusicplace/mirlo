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

const TopToolbar: React.FC = () => {
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
          border: none;
          border-radius: 100%;
          height: 2rem;
          width: 2rem;
          padding: 0;

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
          <InsertMirloWidgetButton />
        </CommandButtonGroup>
      </Toolbar>
    </div>
  );
};

export default TopToolbar;
