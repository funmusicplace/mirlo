import { css } from "@emotion/css";
import Skeleton from "components/common/Skeleton";
import { range } from "lodash";
import React from "react";

import { bp } from "../../constants";

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
        grid-template-columns: ${squares ? `repeat(${rows}, 1fr)` : "none"};
        @media screen and (max-width: ${bp.small}px) {
          grid-template-columns: ${squares ? `repeat(2, 1fr)` : "none"};
        }
        gap: ${margin};
      `}
    >
      {range(rows).map((r) =>
        squares ? (
          <Skeleton key={r} className="aspect-square" />
        ) : (
          <Skeleton key={r} style={{ height }} />
        )
      )}
    </div>
  );
};

export default LoadingBlocks;
