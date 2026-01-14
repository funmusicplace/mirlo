import React from "react";
import { range } from "lodash";
import styled from "@emotion/styled";
import { css } from "@emotion/css";
import { bp } from "../../constants";

const Shine = styled("div")`
  animation: 0.75s shine linear infinite;
  background: #eee;

  background: linear-gradient(
    110deg,
    var(--mi-darken-background-color) 8%,
    var(--mi-darken-x-background-color) 18%,
    var(--mi-darken-background-color) 33%
  );
  border-radius: 5px;
  background-size: 200% 100%;

  @media (max-width: ${bp.small}px) {
    margin: 1rem;
  }

  @keyframes shine {
    to {
      background-position-x: -200%;
    }
  }
`;

/**
 * Loading skeleton blocks for placeholder content.
 * @param rows Number of rows to display.
 * @param height Height of each block.
 * @param margin Margin around each block.
 * @returns Loading skeleton blocks.
 */
const LoadingBlocks: React.FC<{
  rows?: number;
  height?: string;
  margin?: string;
  squares?: boolean;
}> = ({ rows = 4, height = "10rem", margin = "2rem", squares = false }) => {
  return (
    <div
      className={css`
        width: 100%;
        display: ${squares ? "grid" : "flex"};
        flex-direction: ${squares ? "none" : "column"};
        grid-template-columns: ${squares
          ? "repeat(auto-fit, minmax(150px, 1fr))"
          : "none"};
        gap: ${margin};
      `}
    >
      {range(rows).map((r) => (
        <Shine
          key={r}
          style={{
            width: "100%",
            height,
          }}
        />
      ))}
    </div>
  );
};

export default LoadingBlocks;
