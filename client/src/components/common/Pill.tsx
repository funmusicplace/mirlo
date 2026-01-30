import styled from "@emotion/styled";

const Pill = styled.span<{ isHoverable?: boolean; variant?: "warning" }>`
  display: inline-flex;
  background-color: var(--mi-darken-x-background-color);
  border-radius: var(--mi-border-radius-x);
  border: var(--mi-border);
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
  align-items: center;
  transition: 0.25s background-color;

  button {
    margin-left: 0.25rem;
    padding: 0;
  }
  @media (prefers-color-scheme: dark) {
    background-color: var(--mi-lighten-background-color);
  }

  ${(props) => {
    switch (props.variant) {
      case "warning":
        return `
            background: repeating-linear-gradient(45deg, 
              var(--mi-lighten-background-color), 
              var(--mi-lighten-background-color) 10px, 
              var(--mi-normal-background-color) 10px, 
              var(--mi-normal-background-color) 20px);
            border: var(--mi-warning-background-color) 1px solid;
            color: var(--mi-normal-foreground-color);
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
      ? `
  &:hover {
    background-color: var(--mi-darken-background-color);
  }
  `
      : ``}
`;

export default Pill;
