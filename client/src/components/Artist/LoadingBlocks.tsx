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

const LoadingBlocks: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <>
      {range(rows).map((r) => (
        <Shine
          key={r}
          style={{
            width: "100%",
            height: "10rem",
            marginTop: "2rem",
            marginBottom: "2rem",
          }}
        />
      ))}
    </>
  );
};

export default LoadingBlocks;
