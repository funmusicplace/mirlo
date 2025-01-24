import styled from "@emotion/styled";
import { bp } from "../../constants";

const Box = styled.div<{
  variant?: "success" | "info" | "warning";
  compact?: boolean;
  small?: boolean;
}>`
  width: 100%;
  padding: ${(props) => (props.compact ? ".25rem .5rem" : "1.25rem")};
  transition: 0.4s border-radius;
  margin-bottom: 0.5rem;
  border-radius: 5px;

  ${(props) => {
    switch (props.variant) {
      case "success":
        return `
            background: repeating-linear-gradient(
              45deg, 
              var(--mi-success-background-color), 
              var(--mi-success-background-color) 10px, 
              var(--mi-normal-background-color) 10px, 
              var(--mi-normal-background-color) 20px
            );
            border: var(--mi-success-background-color) 1px solid;
            color: var(--mi-normal-foreground-color); 
        `;
      case "info":
        return `
          background-color: var(--mi-info-background-color);
          color: var(--mi-white);
        `;
      case "warning":
        return `
            background: repeating-linear-gradient(45deg, 
              var(--mi-warning-background-color), 
              var(--mi-warning-background-color) 10px, 
              var(--mi-normal-background-color) 10px, 
              var(--mi-normal-background-color) 20px);
            border: var(--mi-warning-background-color) 1px solid;
            color: var(--mi-normal-foreground-color);
          `;
      default:
        return `
          // background-color: var(--mi-lighten-background-color);
        `;
    }
  }}

  ${(props) => (props.small ? "font-size: .85rem" : "")}

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
