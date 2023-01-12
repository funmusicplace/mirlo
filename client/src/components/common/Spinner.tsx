import React from "react";

import { css } from "@emotion/css";
import styled from "@emotion/styled";

const SpinnerWrapper = styled.div<{ size?: "small" }>`
  display: inline-block;
  position: relative;
  width: ${(props) => (props.size ? "60px" : "80px")};
  height: ${(props) => (props.size ? "60px" : "80px")};
  div {
    position: absolute;
    border: 4px solid #555;
    opacity: 1;
    border-radius: 50%;
    animation: lds-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }
  div:nth-of-type(2) {
    animation-delay: -0.5s;
  }
  @keyframes lds-ripple {
    0% {
      top: ${(props) => (props.size ? "26px" : "36px")};
      left: ${(props) => (props.size ? "26px" : "36px")};
      width: 0;
      height: 0;
      opacity: 1;
    }
    100% {
      top: 0px;
      left: 0px;
      width: ${(props) => (props.size ? "52px" : "72px")};
      height: ${(props) => (props.size ? "52px" : "72px")};
      opacity: 0;
    }
  }
`;

export const CenteredSpinner: React.FC = () => {
  return (
    <div
      className={css`
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
      `}
    >
      <Spinner />
    </div>
  );
};

export const FullScreenSpinner: React.FC = () => {
  return (
    <div
      className={css`
        position: absolute;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      `}
    >
      <Spinner />
    </div>
  );
};

export const Spinner: React.FC<{ size?: "small" }> = (props) => {
  return (
    <SpinnerWrapper data-cy="spinner" {...props}>
      <div></div>
      <div></div>
    </SpinnerWrapper>
  );
};

export default Spinner;
