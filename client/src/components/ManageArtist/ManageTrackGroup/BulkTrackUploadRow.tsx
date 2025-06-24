import React from "react";
import { css } from "@emotion/css";

import styled from "@emotion/styled";

export const PercentUpload = styled("div")<{ percentUpload: number }>`
  position: absolute;
  height: 5px;
  bottom: 0;
  opacity: 0.5;
  transition: 0.2s width;
  width: ${(props) => props.percentUpload ?? 0}%;
  ${(props) =>
    props.percentUpload !== 100
      ? `
    animation: 3s shine linear infinite;
    background: linear-gradient(
      110deg,
      var(--mi-pink) 33%,
      #ec7c98 33%,
      #ec7c98 38%,
      var(--mi-pink) 39%,
      var(--mi-pink) 66%,
      #ec7c98 66%,
      #ec7c98 76%,
      var(--mi-pink) 76%
    );
    background-size: 200% 100%;

    @keyframes shine {
      to {
        background-position-x: -200%;
      }
    }`
      : `
    background-color: var(--mi-success-background-color)`}
`;

export const BulkTrackUploadRow: React.FC<{
  track: { title: string; status: number };
}> = ({ track }) => {
  return (
    <div
      className={css`
        position: relative;
        margin-bottom: 0.2rem;
        background: var(--mi-darken-background-color);
      `}
    >
      <PercentUpload percentUpload={track.status} />
      <div
        className={css`
          padding: 0.5rem 1rem;
          position: relative;
          z-index: 1;
        `}
      >
        Uploading {track.title}
      </div>
    </div>
  );
};
