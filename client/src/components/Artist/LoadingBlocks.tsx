import React from "react";
import { range } from "lodash";
import styled from "@emotion/styled";

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

  @keyframes shine {
    to {
      background-position-x: -200%;
    }
  }
`;

const LoadingBlocks: React.FC<{
  rows?: number;
  height?: string;
  margin?: string;
}> = ({ rows = 4, height = "10rem", margin = "2rem" }) => {
  return (
    <>
      {range(rows).map((r) => (
        <Shine
          key={r}
          style={{
            width: "100%",
            height,
            marginTop: margin,
            marginBottom: margin,
          }}
        />
      ))}
    </>
  );
};

export default LoadingBlocks;
