import styled from "@emotion/styled";

import { bp } from "../../constants";

const CoverWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  inset: 0;

  & > div {
    position: absolute;
    top: 40%;
    z-index: 0;
    display: flex;
    justify-content: space-between;
    width: 50px;
    height: 50px;
    filter: drop-shadow(0 0 1rem rgba(55, 55, 55, 0.5));

    & > span {
      width: 5px;
      height: 80%;
      background: white;
      transform-origin: bottom;
      animation: coverBounce 1.4s ease-in-out infinite;

      &:nth-of-type(2) {
        animation-delay: -0.2s;
      }
      &:nth-of-type(3) {
        animation-delay: -0.4s;
      }
      &:nth-of-type(4) {
        animation-delay: -0.6s;
      }
      &:nth-of-type(5) {
        animation-delay: -0.8s;
      }
      &:nth-of-type(6) {
        animation-delay: -1s;
      }
      &:nth-of-type(7) {
        animation-delay: -1.2s;
      }
    }
  }

  @media (max-width: ${bp.large}px) {
    & > div {
      top: 38%;
      width: 40px;
      height: 40px;
      filter: drop-shadow(10px 10px 4rem crimson);
    }
    & > div > span {
      width: 3px;
    }
  }

  @keyframes coverBounce {
    0%,
    100% {
      transform: scaleY(0.4);
    }
    50% {
      transform: scaleY(1);
    }
  }
`;

const InlineWrapper = styled.span`
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 0.75rem;
  margin-right: 0.375rem;
  vertical-align: -0.0625rem;

  & > span {
    display: block;
    width: 2px;
    background: currentColor;
    border-radius: 1px;
    transform-origin: bottom center;
    animation: inlineBounce 0.9s ease-in-out infinite;

    &:nth-of-type(1) {
      animation-delay: 0s;
      height: 60%;
    }
    &:nth-of-type(2) {
      animation-delay: 0.15s;
      height: 100%;
    }
    &:nth-of-type(3) {
      animation-delay: 0.3s;
      height: 75%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    & > span {
      animation: none;
      transform: scaleY(0.8);
    }
  }

  @keyframes inlineBounce {
    0%,
    100% {
      transform: scaleY(0.4);
    }
    50% {
      transform: scaleY(1);
    }
  }
`;

export const PlayingMusicBars: React.FC<{
  variant?: "cover" | "inline";
}> = ({ variant = "cover" }) => {
  if (variant === "inline") {
    return (
      <InlineWrapper aria-hidden="true">
        <span />
        <span />
        <span />
      </InlineWrapper>
    );
  }
  return (
    <CoverWrapper>
      <div>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </CoverWrapper>
  );
};
