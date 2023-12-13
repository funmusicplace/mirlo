import styled from "@emotion/styled";
import { bp } from "../../constants";

type WrapperProps = {
  width: number;
  height: number;
};

const Wrapper = styled.div<WrapperProps>`
  bottom: 0;
  right: 0;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  div {
    justify-content: space-between;
    height: 60px;
    width: 60px;
    display: flex;
    filter: drop-shadow(0 0 1rem rgba(55, 55, 55, 0.5));
    position: absolute;
    top: 40%;
  }

  @keyframes bounce {
    10% {
      transform: scaleY(0.3); /* start by scaling to 30% */
    }

    30% {
      transform: scaleY(1); /* scale up to 100% */
    }

    60% {
      transform: scaleY(0.5); /* scale down to 50% */
    }

    70% {
      transform: scaleY(0.4); /* scale down to 40% */
    }

    80% {
      transform: scaleY(0.75); /* scale up to 75% */
    }

    100% {
      transform: scaleY(0.6); /* scale down to 60% */
    }
  }

  span {
    width: 5px;
    height: 80%;
    background-color: white;
    border-radius: 0px;
    transform-origin: bottom;
    animation: bounce 3.3s ease infinite alternate;
    content: "";
  }

  span {
    &:nth-of-type(2) {
      animation-delay: -2.2s; /* Start at the end of animation */
    }

    &:nth-of-type(3) {
      animation-delay: -3.7s; /* Start mid-way of return of animation */
    }
    &:nth-of-type(4) {
      animation-delay: -4.6s; /* Start mid-way of return of animation */
    }
    &:nth-of-type(5) {
      animation-delay: -5.7s; /* Start mid-way of return of animation */
    }
    &:nth-of-type(6) {
      animation-delay: -6.8s; /* Start mid-way of return of animation */
    }
  }

  @media (max-width: ${bp.small}px) {
    div {
      height: 30px;
      width: 30px;
      filter: drop-shadow(10px 10px 4rem crimson);
    }

    span {
      width: 3px;
    }
  }
`;

export const PlayingMusicBars: React.FC<{ width: number; height: number }> = ({
  width,
  height,
}) => {
  return (
    <Wrapper width={width} height={height}>
      <div>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </Wrapper>
  );
};
