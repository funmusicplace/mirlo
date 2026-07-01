import { css } from "@emotion/css";
import React from "react";

const DividerWithText: React.FC<{ text: string }> = ({ text }) => (
  <div
    className={css`
      display: flex;
      justify-content: stretch;
      align-items: center;
      margin: 1rem 0;
      width: 100%;

      hr {
        flex-grow: 1;
        margin: 1rem;
        border-color: var(--mi-tint-x-color);
      }
    `}
  >
    <hr />
    {text}
    <hr />
  </div>
);

export default DividerWithText;
