import styled from "@emotion/styled";

const Pill = styled.span<{
  isHoverable?: boolean;
  variant?: "warning" | "tint";
}>`
  display: inline-flex;
  background-color: var(--mi-lighten-x-background-color);
  border-radius: var(--mi-border-radius-x);
  border: var(--mi-border);
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  align-items: center;
  transition: 0.25s background-color;

  button {
    margin-left: 0.25rem;
    padding: 0;
    font-size: 0.8rem;
    height: 2rem;
    width: 2rem;
  }
  ${(props) => {
    switch (props.variant) {
      case "tint":
        return `
            background-color: var(--mi-button-tint-color);
          `;
      case "warning":
        return `
            background: repeating-linear-gradient(45deg, 
              var(--mi-lighten-background-color), 
              var(--mi-lighten-background-color) 10px, 
              var(--mi-background-color) 10px, 
              var(--mi-background-color) 20px);
            border: var(--mi-warning-background-color) 1px solid;
            color: var(--mi-text-color);
            font-weight: bold;
          `;
      default:
        return `
          // background-color: var(--mi-lighten-background-color);
        `;
    }
  }}
  ${(props) =>
    props.isHoverable
      ? props.variant === "tint"
        ? `
  &:hover {
    background-color: var(--mi-button-tint-x-color);
  }
  `
        : `
  &:hover {
    background-color: var(--mi-darken-background-color);
  }
  `
      : ``}
`;

export default Pill;
