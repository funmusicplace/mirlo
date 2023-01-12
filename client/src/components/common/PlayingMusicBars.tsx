import styled from "@emotion/styled";

type WrapperProps = {
  width: number;
  height: number;
};

const Wrapper = styled.div<WrapperProps>`
  position: absolute;
  bottom: 0;
  right: 0;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.width}px;
  height: ${(props) => props.height}px;

  div {
    justify-content: space-between;
    height: 20px;
    width: 20px;
    display: flex;
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

    80% {
      transform: scaleY(0.75); /* scale up to 75% */
    }

    100% {
      transform: scaleY(0.6); /* scale down to 60% */
    }
  }

  span {
    width: 5px;
    height: 100%;
    background-color: ${(props) => props.theme.colors.primary};
    border-radius: 3px;
    transform-origin: bottom;
    animation: bounce 2.2s ease infinite alternate;
    content: "";
  }

  span {
    &:nth-of-type(2) {
      animation-delay: -2.2s; /* Start at the end of animation */
    }

    &:nth-of-type(3) {
      animation-delay: -3.7s; /* Start mid-way of return of animation */
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
      </div>
    </Wrapper>
  );
};
