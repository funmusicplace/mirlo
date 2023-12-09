import styled from "@emotion/styled";
import { bp } from "../../constants";

const Box = styled.div<{ variant?: "success" | "info" }>`
  width: 100%;
  padding: 1.5rem;
  transition: 0.4s border-radius;
  margin-bottom: 0.5rem;
  border-radius: 5px;

  ${(props) => {
    switch (props.variant) {
      case "success":
        return `
          background-color: var(--mi-success-background-color);
          color: var(--mi-white);
        `;
      case "info":
        return `
          background-color: var(--mi-info-background-color);
          color: var(--mi-white);
        `;
      default:
        return `
          // background-color: var(--mi-lighten-background-color);
        `;
    }
  }}

  input {
    background: var(--mi-lighten-background-color);
  }

  textarea {
    background: var(--mi-lighten-background-color);
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding: 0.5rem 0.7rem;
    // background-color: var(--mi-normal-background-color);
  }
`;

export default Box;
