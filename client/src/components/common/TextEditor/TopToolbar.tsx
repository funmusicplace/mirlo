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
        > span > button {
          background-color: none;
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
            background-color: var(--mi-primary-color);
            color: var(--mi-secondary-color);
          }
        }
      `}
    >
      <Toolbar>
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
