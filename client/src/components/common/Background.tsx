import styled from "@emotion/styled";

type Props = {
  transparent?: boolean;
};

const Background = styled.div<Props>`
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0, 0, 0); /* Fallback color */
  background-color: ${({ transparent }) =>
    transparent ? "transparent" : "rgba(0, 0, 0, 0.4)"}; /* Black w/ opacity */
`;

export default Background;
